import * as Completions from "@src/completions"
import { tgroups, windowTgroup, tgroupTabs } from "@src/lib/tab_groups"

class TabGroupCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(group: string, tabCount: number) {
        super()
        this.value = group
        this.fuseKeys.push(group)
        this.html = html`<tr class="TabGroupCompletionOption option">
            <td class="title">${group}</td>
            <td class="tabcount">${tabCount} tab${
            tabCount !== 1 ? "s" : ""
        }</td>
        </tr>`
    }
}

export class TabGroupCompletionSource extends Completions.CompletionSourceFuse {
    public options: TabGroupCompletionOption[]

    constructor(private _parent: any) {
        super(
            ["tgroupswitch", "tgroupmove"],
            "TabGroupCompletionSource",
            "Tab Groups",
        )

        this.updateOptions()
        this._parent.appendChild(this.node)
    }

    async onInput(_: string) {}

    async filter(exstr: string) {
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

        return this.updateDisplay()
    }

    private async updateOptions() {
        const currentGroup = await windowTgroup()
        const otherGroups = [...(await tgroups())].filter(
            group => group !== currentGroup,
        )
        this.options = await Promise.all(
            otherGroups.map(async group => {
                const tabCount = (await tgroupTabs(group)).length
                const o = new TabGroupCompletionOption(group, tabCount)
                o.state = "normal"
                return o
            }),
        )
        return this.updateDisplay()
    }
}
