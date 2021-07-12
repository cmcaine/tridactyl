import * as Extensions from "@src/lib/extension_info"
import * as Completions from "@src/completions"

class ExtensionsCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(public name: string, public optionsUrl: string) {
        super()
        this.fuseKeys.push(this.name)

        this.html = html`<tr class="option">
            <td class="title">${name}</td>
        </tr>`
    }
}

export class ExtensionsCompletionSource extends Completions.CompletionSourceFuse {
    public options: ExtensionsCompletionOption[]

    constructor(private _parent) {
        super(["extoptions"], "ExtensionsCompletionSource", "Extension options", "Extensions")

        this._parent.appendChild(this.node)
    }

    public async filter(exstr: string) {
        this.lastExstr = exstr
        const [prefix, query] = this.splitOnPrefix(exstr)

        if (prefix) {
            if (this.state === "hidden") {
                this.state = "normal"
            }
        } else {
            this.state = "hidden"
            return
        }

        const extensions = await Extensions.listExtensions()

        this.options = this.scoreOptions(
            extensions
                .filter(extension => extension.name.startsWith(query))
                .map(
                    extension =>
                        new ExtensionsCompletionOption(
                            extension.name,
                            extension.optionsUrl,
                        ),
                ),
        )

        return this.updateChain()
    }

    updateChain() {
        this.options.forEach(option => (option.state = "normal"))

        return this.updateDisplay()
    }

    select(option: ExtensionsCompletionOption) {
        this.completion = "extoptions " + option.name
        option.state = "focused"
        this.lastFocused = option
    }

    private scoreOptions(options: ExtensionsCompletionOption[]) {
        return options.sort((o1, o2) => o1.name.localeCompare(o2.name))
    }
}
