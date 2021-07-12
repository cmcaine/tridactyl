import { browserBg } from "@src/lib/webext"
import * as Completions from "@src/completions"

class WindowCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(win: browser.windows.Window) {
        super()
        this.value = win.id
        this.fuseKeys.push(`${win.title}`)
        this.fuseKeys.push(`${win.id}`)

        // Create HTMLElement
        this.html = html`<tr
            class="WindowCompletionOption option ${win.incognito
                ? "incognito"
                : ""}"
        >
            <td class="privatewindow"></td>
            <td class="prefix">${win.focused ? "%" : ""}</td>
            <td class="id">${win.id}</td>
            <td class="title">${win.title}</td>
            <td class="tabcount">
                ${win.tabs.length} tab${win.tabs.length !== 1 ? "s" : ""}
            </td>
        </tr>`
    }
}

export class WindowCompletionSource extends Completions.CompletionSourceFuse {
    public options: WindowCompletionOption[]

    constructor(private _parent) {
        super(
            ["tabpush", "winclose", "winmerge"],
            "WindowCompletionSource",
            "Windows",
            "Window",
        )

        this.updateOptions()
        this._parent.appendChild(this.node)
    }

    async onInput(exstr) {
        // Schedule an update, if you like. Not very useful for windows, but
        // will be for other things.
        return this.updateOptions(exstr)
    }

    async filter(exstr) {
        this.lastExstr = exstr
        return this.onInput(exstr)
    }

    private async updateOptions(exstr = "") {
        this.lastExstr = exstr
        const [prefix] = this.splitOnPrefix(exstr)

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

        this.options = (await browserBg.windows.getAll({ populate: true })).map(
            win => {
                const o = new WindowCompletionOption(win)
                o.state = "normal"
                return o
            },
        )
        return this.updateDisplay()
    }
}
