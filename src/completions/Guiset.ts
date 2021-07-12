import * as Completions from "@src/completions"
import { potentialRules, metaRules } from "@src/lib/css_util"

class GuisetCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(public value: string, displayValue: string) {
        super()
        this.fuseKeys.push(value)

        this.html = html`<tr class="GuisetCompletionOption option">
            <td class="value">${displayValue}</td>
        </tr>`
    }
}

export class GuisetCompletionSource extends Completions.CompletionSourceFuse {
    public options: GuisetCompletionOption[]

    constructor(private _parent) {
        super(["guiset", "guiset_quiet"], "GuisetCompletionSource", "Guiset", "Guiset")

        this._parent.appendChild(this.node)
    }

    public async filter(exstr: string) {
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
        this.completion = undefined

        let ruleName = ""
        let subRule = ""
        if (query) {
            const args = query.trim().split(" ")
            ruleName = args[0] || ""
            subRule = args[1] || ""
        }
        this.options = []
        if (metaRules[ruleName]) {
            this.options = this.options.concat(
                Object.keys(metaRules[ruleName])
                    .filter(s => s.startsWith(subRule))
                    .map(
                        s => new GuisetCompletionOption(`${ruleName} ${s}`, s),
                    ),
            )
        }
        if (potentialRules[ruleName]) {
            this.options = this.options.concat(
                Object.keys(potentialRules[ruleName].options)
                    .filter(s => s.startsWith(subRule))
                    .map(
                        s => new GuisetCompletionOption(`${ruleName} ${s}`, s),
                    ),
            )
        }
        if (this.options.length === 0) {
            this.options = Object.keys(metaRules)
                .concat(Object.keys(potentialRules))
                .filter(s => s.startsWith(ruleName))
                .map(s => new GuisetCompletionOption(s, s))
        }

        return this.updateChain()
    }

    updateChain() {
        // Options are pre-trimmed to the right length.
        this.options.forEach(option => (option.state = "normal"))

        // Call concrete class
        return this.updateDisplay()
    }

    onInput(arg) {
        return this.filter(arg)
    }
}
