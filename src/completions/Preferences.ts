import * as Completions from "@src/completions"
import * as Native from "@src/lib/native"

class PreferenceCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(public value: string, public prefvalue: string) {
        super()
        this.fuseKeys.push(value)
        this.html = html`<tr class="PreferenceCompletionOption option">
            <td class="name">${value}</td>
            <td class="value">${prefvalue}</td>
        </tr>`
    }
}

export class PreferenceCompletionSource extends Completions.CompletionSourceFuse {
    public options: PreferenceCompletionOption[]

    constructor(private _parent) {
        super(["setpref"], "PreferenceCompletionSource", "Preference", "Preference")

        this._parent.appendChild(this.node)
    }

    public onInput(exstr: string) {
        return this.filter(exstr)
    }

    public async filter(exstr: string) {
        if (!exstr) {
            this.state = "hidden"
            return
        }
        const pref = this.splitOnPrefix(exstr)[1]
        if (pref === undefined) {
            this.state = "hidden"
            return
        }
        this.lastExstr = exstr
        const preferences = await Native.getPrefs()
        this.options = Object.keys(preferences)
            .filter(key => key.startsWith(pref))
            .map(key => new PreferenceCompletionOption(key, preferences[key]))
        if (this.options.length > 0) this.state = "normal"
        return this.updateChain()
    }
}
