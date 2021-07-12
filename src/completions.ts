/*

Have an array of all completion sources. Completion sources display nothing if the filter doesn't match for them.

On each input event, call updateCompletions on the array. That will mutate the array and update the display as required.

How to handle cached e.g. buffer information going out of date?

Concrete completion classes have been moved to src/completions/.

*/

import Fuse from "fuse.js"
import { enumerate } from "@src/lib/itertools"
import { toNumber } from "@src/lib/convert"
import * as aliases from "@src/lib/aliases"
import { backoff } from "@src/lib/patience"
import * as config from "@src/lib/config"

export const DEFAULT_FAVICON = browser.runtime.getURL(
    "static/defaultFavicon.svg",
)

// {{{ INTERFACES

type OptionState = "focused" | "hidden" | "normal"

export abstract class CompletionOption {
    /** What to fill into cmdline */
    value: string
    /** Control presentation of the option */
    abstract state: OptionState
}

export abstract class CompletionSource {
    readonly options: CompletionOption[]
    node: HTMLElement
    public completion: string
    public args: string
    protected prefixes: string[] = []
    protected lastFocused: CompletionOption
    private _state: OptionState
    private _prevState: OptionState

    constructor(prefixes) {
        const commands = aliases.getCmdAliasMapping()

        // Now, for each prefix given as argument, add it to the completionsource's prefix list and also add any alias it has
        prefixes
            .map(p => p.trim())
            .forEach(p => {
                this.prefixes.push(p)
                if (commands[p])
                    this.prefixes = this.prefixes.concat(commands[p])
            })

        // Not sure this is necessary but every completion source has it
        this.prefixes = this.prefixes.map(p => p + " ")
    }

    /** Control presentation of Source */
    set state(newstate: OptionState) {
        switch (newstate) {
            case "normal":
                this.node.classList.remove("hidden")
                this.completion = undefined
                break
            case "hidden":
                this.node.classList.add("hidden")
                break
        }
        this._prevState = this._state
        this._state = newstate
    }

    get state() {
        return this._state
    }

    shouldRefresh() {
        // A completion source should be refreshed if it is not hidden or if it just became hidden
        return this._state !== "hidden" || this.state !== this._prevState
    }

    prev(inc = 1): Promise<boolean> {
        return this.next(-1 * inc)
    }

    deselect() {
        this.completion = undefined
        if (this.lastFocused !== undefined) this.lastFocused.state = "normal"
    }

    /** Update [[node]] to display completions relevant to exstr */
    public abstract filter(exstr: string): Promise<void>

    abstract next(inc?: number): Promise<boolean>
}

// Default classes

export abstract class CompletionOptionHTML extends CompletionOption {
    public html: HTMLElement
    public value

    private _state: OptionState = "hidden"

    /** Control presentation of element */
    set state(newstate: OptionState) {
        // console.log("state from to", this._state, newstate)
        switch (newstate) {
            case "focused":
                this.html.classList.add("focused")
                this.html.classList.remove("hidden")
                const myRect = this.html.getClientRects()[0]
                if (myRect) {
                    const container = document.getElementById("completions")
                    const boxRect = container.getClientRects()[0]
                    if (myRect.bottom > boxRect.bottom)
                        this.html.scrollIntoView()
                    else if (myRect.top < boxRect.top)
                        this.html.scrollIntoView(false)
                }
                break
            case "normal":
                this.html.classList.remove("focused")
                this.html.classList.remove("hidden")
                break
            case "hidden":
                this.html.classList.remove("focused")
                this.html.classList.add("hidden")
                break
        }
        this._state = newstate
    }

    get state() {
        return this._state
    }
}

export interface CompletionOptionFuse extends CompletionOptionHTML {
    // For fuzzy matching
    fuseKeys: any[]
}

export interface ScoredOption {
    index: number
    option: CompletionOptionFuse
    score: number
}

export abstract class CompletionSourceFuse extends CompletionSource {
    public node
    public options: CompletionOptionFuse[]
    public shouldSetStateFromScore = false
    public name = ""

    fuseOptions = {
        keys: ["fuseKeys"],
        shouldSort: true,
        includeScore: true,
        findAllMatches: true,
        ignoreLocation: true,
        ignoreFieldNorm: true,
        threshold: config.get("completionfuzziness"),
        minMatchCharLength: 1,
    }

    // PERF: Could be expensive not to cache Fuse()
    // yeah, it was.
    fuse = undefined

    protected lastExstr: string
    protected sortScoredOptions = false

    protected optionContainer = html`<table class="optionContainer"></table>`

    constructor(prefixes, className: string, title?: string, name = "") {
        super(prefixes)
        this.node = html`<div class="${className} hidden">
            <div class="sectionHeader">${title || className}</div>
        </div>`
        this.name = name
        this.node.appendChild(this.optionContainer)
        this.shouldSetStateFromScore =
            config.get("completions", this.name, "autoselect") === "true"
        this.state = "hidden"
    }

    // Helpful default implementations

    public async filter(exstr: string) {
        this.lastExstr = exstr
        await this.onInput(exstr)
        return this.updateChain()
    }

    updateChain(exstr = this.lastExstr, options = this.options) {
        if (options === undefined) {
            this.state = "hidden"
            return
        }

        const [prefix, query] = this.splitOnPrefix(exstr)

        // console.log(prefix, query, options)

        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal"
            }
        } else {
            this.state = "hidden"
            return
        }

        // Filter by query if query is not empty
        if (query) {
            this.setStateFromScore(this.scoredOptions(query))
            // Else show all options
        } else {
            options.forEach(option => (option.state = "normal"))
        }

        // Call concrete class
        this.updateDisplay()
    }

    select(option: CompletionOption) {
        if (this.lastExstr !== undefined && option !== undefined) {
            const [prefix] = this.splitOnPrefix(this.lastExstr)
            this.completion = prefix + option.value
            this.args = option.value
            option.state = "focused"
            this.lastFocused = option
        } else {
            throw new Error("lastExstr and option must be defined!")
        }
    }

    splitOnPrefix(exstr: string) {
        for (const prefix of this.prefixes) {
            if (exstr.startsWith(prefix)) {
                const query = exstr.replace(prefix, "")
                return [prefix, query]
            }
        }
        return [undefined, undefined]
    }

    /** Rtn sorted array of {option, score} */
    scoredOptions(query: string): ScoredOption[] {
        const searchThis = this.options.map((elem, index) => ({
            index,
            fuseKeys: elem.fuseKeys,
        }))
        this.fuse = new Fuse(searchThis, this.fuseOptions)
        return this.fuse.search(query).map(result => {
            // console.log(result, result.item, query)
            const index = toNumber(result.item.index)
            return {
                index,
                option: this.options[index],
                score: result.score as number,
            }
        })
    }

    /** Set option state by score

        For now just displays all scored elements (see threshold in fuse) and
        focus the best match.
    */
    setStateFromScore(scoredOpts: ScoredOption[], _?) {
        const autoselect = this.shouldSetStateFromScore
        const matches = scoredOpts.map(res => res.index)

        const hidden_options = []
        for (const [index, option] of enumerate(this.options)) {
            if (matches.includes(index)) option.state = "normal"
            else {
                option.state = "hidden"
                hidden_options.push(option)
            }
        }

        // ideally, this would not deselect anything unless it fell off the list of matches
        if (matches.length && autoselect) {
            this.select(this.options[matches[0]])
        } else {
            this.deselect()
        }

        // sort this.options by score
        if (this.sortScoredOptions) {
            const sorted_options = matches.map(index => this.options[index])
            this.options = sorted_options.concat(hidden_options)
        }
    }

    /** Call to replace the current display */
    updateDisplay() {
        const newContainer = this.optionContainer.cloneNode(false) as HTMLElement

        for (const option of this.options) {
            if (option.state !== "hidden")
                // This is probably slow: `.html` means the HTML parser will be invoked
                newContainer.appendChild(option.html)
        }
        this.optionContainer.replaceWith(newContainer)
        this.optionContainer = newContainer
        this.next(0)
    }

    async next(inc = 1) {
        if (this.state !== "hidden") {
            // We're abusing `async` here to help us to catch errors in backoff
            // and to make it easier to return consistent types
            /* eslint-disable-next-line @typescript-eslint/require-await */
            return backoff(async () => {
                const visopts = this.options.filter(o => o.state !== "hidden")
                const currind = visopts.findIndex(o => o.state === "focused")
                this.deselect()
                // visopts.length + 1 because we want an empty completion at the end
                const max = visopts.length + 1
                const opt = visopts[(currind + inc + max) % max]
                if (opt) this.select(opt)
                return true
            })
        } else return false
    }

    /* abstract onUpdate(query: string, prefix: string, options: CompletionOptionFuse[]) */

    // Lots of methods don't need this but some do
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars-experimental
    async onInput(exstr: string) {}
}

// }}}
