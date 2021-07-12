import * as Completions from "@src/completions"
import { staticThemes } from "@src/.metadata.generated"
import * as config from "@src/lib/config"

export class ThemeCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []
    constructor(public value: string, public documentation: string = "") {
        super()
        this.fuseKeys.push(this.value)

        // Create HTMLElement
        this.html = html`<tr class="ThemeCompletionOption option">
            <td class="theme">${value}</td>
        </tr>`
    }
}

export class ThemeCompletionSource extends Completions.CompletionSourceFuse {
    public options: ThemeCompletionOption[]

    constructor(private _parent) {
        super(["set theme", "colourscheme"], "ThemeCompletionSource", "Themes", "Theme")

        this.updateOptions()
        this._parent.appendChild(this.node)
    }

    async filter(exstr) {
        this.lastExstr = exstr
        return this.onInput(exstr)
    }

    async onInput(exstr) {
        return this.updateOptions(exstr)
    }

    private async updateOptions(exstr = "") {
        this.lastExstr = exstr

        const themes = staticThemes.concat(
            Object.keys(await config.get("customthemes")),
        )
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

        // Add all excmds that start with exstr and that tridactyl has metadata about to completions
        this.options = this.scoreOptions(
            themes
                .filter(name => name.startsWith(query))
                .map(name => new ThemeCompletionOption(name)),
        )

        this.options.forEach(o => (o.state = "normal"))
        return this.updateChain()
    }

    private scoreOptions(options: ThemeCompletionOption[]) {
        return options.sort((o1, o2) => o1.value.localeCompare(o2.value))

        // Too slow with large profiles
        // let histpos = state.cmdHistory.map(s => s.split(" ")[0]).reverse()
        // return exstrs.sort((a, b) => {
        //     let posa = histpos.findIndex(x => x == a)
        //     let posb = histpos.findIndex(x => x == b)
        //     // If two ex commands have the same position, sort lexically
        //     if (posa == posb) return a < b ? -1 : 1
        //     // If they aren't found in the list they get lower priority
        //     if (posa == -1) return 1
        //     if (posb == -1) return -1
        //     // Finally, sort by history position
        //     return posa < posb ? -1 : 1
        // })
    }
}
