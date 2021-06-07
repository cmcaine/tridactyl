import * as Perf from "@src/perf"
import { browserBg } from "@src/lib/webext"
import { enumerate } from "@src/lib/itertools"
import * as Containers from "@src/lib/containers"
import * as Completions from "@src/completions"
import * as config from "@src/lib/config"
import * as Messaging from "@src/lib/messaging"

class BufferCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []
    public tabIndex: number
    public tabId: number

    constructor(
        public value: string,
        tab: browser.tabs.Tab,
        public isAlternative = false,
        container: browser.contextualIdentities.ContextualIdentity,
    ) {
        super()
        this.tabIndex = tab.index
        this.tabId = tab.id

        // pre contains max four uppercase characters for tab status.
        // If statusstylepretty is set to true replace use unicode characters,
        // but keep plain letters in hidden column for completion.
        let preplain = ""
        if (tab.active) preplain += "%"
        else if (isAlternative) {
            preplain += "#"
            this.value = "#"
        }
        let pre = preplain
        if (tab.pinned) preplain += "P"
        if (tab.audible) preplain += "A"
        if (tab.mutedInfo.muted) preplain += "M"
        if (tab.discarded) preplain += "D"

        if (config.get("completions", "Tab", "statusstylepretty") === "true") {
            if (tab.pinned) pre += "\uD83D\uDCCC"
            if (tab.audible) pre += "\uD83D\uDD0A"
            if (tab.mutedInfo.muted) pre += "\uD83D\uDD07"
            if (tab.discarded) pre += "\u2296"
        } else {
            pre = preplain
        }

        // Push prefix before padding so we don't match on whitespace
        this.fuseKeys.push(pre)
        this.fuseKeys.push(preplain)

        // Push properties we want to fuzmatch on
        this.fuseKeys.push(String(tab.index + 1), tab.title, tab.url)

        // Create HTMLElement
        const favIconUrl = tab.favIconUrl
            ? tab.favIconUrl
            : Completions.DEFAULT_FAVICON
        const indicator = tab.audible ? String.fromCodePoint(0x1f50a) : ""
        this.html = html`<tr
            class="BufferCompletionOption option container_${container.color} container_${container.icon} container_${container.name}"
        >
            <td class="prefix">${pre}</td>
            <td class="prefixplain" hidden>${preplain}</td>
            <td class="container"></td>
            <td class="icon"><img loading="lazy" src="${favIconUrl}" /></td>
            <td class="title">${tab.index + 1}: ${indicator} ${tab.title}</td>
            <td class="content">
                <a class="url" target="_blank" href=${tab.url}>${tab.url}</a>
            </td>
        </tr>`
    }
}

export class BufferCompletionSource extends Completions.CompletionSourceFuse {
    public options: BufferCompletionOption[]
    private shouldSetStateFromScore = true

    // TODO:
    //     - store the exstr and trigger redraws on user or data input without
    //       callback faffery
    //     - sort out the element redrawing.

    constructor(private _parent) {
        super(
            ["tab", "tabclose", "tabdetach", "tabduplicate", "tabmove"],
            "BufferCompletionSource",
            "Tabs",
        )
        this.sortScoredOptions = true
        this.shouldSetStateFromScore =
            config.get("completions", "Tab", "autoselect") === "true"
        this.updateOptions()
        this._parent.appendChild(this.node)

        Messaging.addListener("tab_changes", () => this.reactToTabChanges())
    }

    async onInput(exstr) {
        // Schedule an update, if you like. Not very useful for tabs, but
        // will be for other things.
        return this.updateOptions(exstr)
    }

    async filter(exstr) {
        this.lastExstr = exstr
        return this.onInput(exstr)
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, this.shouldSetStateFromScore)
    }

    /** Score with fuse unless query is a single # or looks like a tab index */
    scoredOptions(
        query: string,
        options = this.options,
    ): Completions.ScoredOption[] {
        const args = query.trim().split(/\s+/gu)
        if (args.length === 1) {
            // if query is an integer n and |n| < options.length
            if (Number.isInteger(Number(args[0]))) {
                let index = Number(args[0]) - 1
                if (Math.abs(index) < options.length) {
                    index = index.mod(options.length)
                    // options order might change by scored sorting
                    return this.TabscoredOptionsStartsWithN(index, options)
                }
            } else if (args[0] === "#") {
                for (const [index, option] of enumerate(options)) {
                    if (option.isAlternative) {
                        return [
                            {
                                index,
                                option,
                                score: 0,
                            },
                        ]
                    }
                }
            }
        }

        // If not yet returned...
        return super.scoredOptions(query)
    }

    /** Return the scoredOption[] result for the tab index startswith n */
    private TabscoredOptionsStartsWithN(
        n: number,
        options: BufferCompletionOption[],
    ): Completions.ScoredOption[] {
        const nstr = (n + 1).toString()
        const res = []
        for (const [index, option] of enumerate(options)) {
            if ((option.tabIndex + 1).toString().startsWith(nstr)) {
                res.push({
                    index, // index is not tabIndex, changed by score
                    option,
                    score: 0,
                })
            }
        }

        // old input will change order: 12 => 123 => 12
        res.sort((a, b) => a.option.tabIndex - b.option.tabIndex)
        return res
    }

    private async fillOptions() {
        const tabs: browser.tabs.Tab[] = await browserBg.tabs.query({
            currentWindow: true,
        })
        const options = []
        // Get alternative tab, defined as last accessed tab.
        tabs.sort((a, b) => b.lastAccessed - a.lastAccessed)
        const alt = tabs[1]

        const useMruTabOrder = config.get("tabsort") === "mru"
        if (!useMruTabOrder) {
            tabs.sort((a, b) => a.index - b.index)
        }

        const container_all = await browserBg.contextualIdentities.query({})
        const container_map = new Map()
        container_all.forEach(elem =>
            container_map.set(elem.cookieStoreId, elem),
        )
        // firefox-default is not in contextualIdenetities
        container_map.set("firefox-default", Containers.DefaultContainer)

        for (const tab of tabs) {
            let tab_container = container_map.get(tab.cookieStoreId)
            if (!tab_container) {
                tab_container = Containers.DefaultContainer
            }
            options.push(
                new BufferCompletionOption(
                    (tab.index + 1).toString(),
                    tab,
                    tab === alt,
                    tab_container,
                ),
            )
        }

        this.options = options
    }

    // Eslint doesn't like this decorator but there's nothing we can do about it
    // eslint-disable-next-line @typescript-eslint/member-ordering
    @Perf.measuredAsync
    private async updateOptions(exstr = "") {
        this.lastExstr = exstr
        const [prefix, query] = this.splitOnPrefix(exstr)

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

        // When the user is asking for tabmove completions, don't autoselect if the query looks like a relative move https://github.com/tridactyl/tridactyl/issues/825
        if (prefix === "tabmove")
            this.shouldSetStateFromScore = !/^[+-][0-9]+$/.exec(query)

        await this.fillOptions()
        this.completion = undefined

        /* console.log('updateOptions', this.optionContainer) */
        if (query && query.trim().length > 0) {
            this.setStateFromScore(this.scoredOptions(query))
        } else {
            this.options.forEach(option => (option.state = "normal"))
        }
        return this.updateDisplay()
    }

    /**
     * Update the list of possible tab options and select (focus on)
     * the appropriate option.
     */
    private async reactToTabChanges(): Promise<void> {
        const prevOptions = this.options
        await this.updateOptions(this.lastExstr)

        if (!prevOptions || !this.options || !this.lastFocused) return

        // Determine which option to focus on
        const diff: BufferCompletionOption[] = []
        for (const prevOption of prevOptions) {
            if (
                !this.options.find(
                    newOption => prevOption.tabId === newOption.tabId,
                )
            )
                diff.push(prevOption)
        }
        const lastFocusedTabCompletion = this
            .lastFocused as BufferCompletionOption

        // If the focused option was removed then focus on the next option
        if (
            diff.length === 1 &&
            diff[0].tabId === lastFocusedTabCompletion.tabId
        ) {
            this.select(this.getTheNextTabOption(lastFocusedTabCompletion))
        }
    }

    /**
     * Gets the next option in this BufferCompletionSource assuming
     * that this BufferCompletionSource length has been reduced by 1
     */
    private getTheNextTabOption(option: BufferCompletionOption) {
        if (option.tabIndex === this.options.length) {
            return this.options[this.options.length - 1]
        }
        return this.options[option.tabIndex]
    }
}
