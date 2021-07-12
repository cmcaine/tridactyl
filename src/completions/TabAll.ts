import * as Perf from "@src/perf"
import { browserBg } from "@src/lib/webext"
import * as Containers from "@src/lib/containers"
import * as Completions from "@src/completions"
import * as Messaging from "@src/lib/messaging"
import * as config from "@src/lib/config"

class TabAllCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []
    public tab: browser.tabs.Tab
    constructor(
        public value: string,
        tab: browser.tabs.Tab,
        winindex: number,
        container: browser.contextualIdentities.ContextualIdentity,
        incognito: boolean,
    ) {
        super()
        this.value = `${winindex}.${tab.index + 1}`
        this.fuseKeys.push(this.value, tab.title, tab.url)
        this.tab = tab

        // Create HTMLElement
        const favIconUrl = tab.favIconUrl
            ? tab.favIconUrl
            : Completions.DEFAULT_FAVICON
        this.html = html`<tr
            class="BufferAllCompletionOption option container_${container.color} container_${container.icon} container_${container.name} ${incognito
                ? "incognito"
                : ""}"
        >
            <td class="prefix"></td>
            <td class="privatewindow"></td>
            <td class="container"></td>
            <td class="icon"><img src="${favIconUrl}" /></td>
            <td class="title">${this.value}: ${tab.title}</td>
            <td class="content">
                <a class="url" target="_blank" href=${tab.url}>${tab.url}</a>
            </td>
        </tr>`
    }
}

export class TabAllCompletionSource extends Completions.CompletionSourceFuse {
    public options: TabAllCompletionOption[]
    

    constructor(private _parent) {
        super(["taball", "tabgrab"], "TabAllCompletionSource", "All Tabs", "TabAll")

        this.updateOptions()
        this._parent.appendChild(this.node)

        Messaging.addListener("tab_changes", () => this.reactToTabChanges())
    }

    async onInput(exstr) {
        return this.updateOptions(exstr)
    }

    /**
     * Map all windows into a {[windowId]: window} object
     */
    private async getWindows() {
        const windows = await browserBg.windows.getAll()
        const response: { [windowId: number]: browser.windows.Window } = {}
        windows.forEach(win => (response[win.id] = win))
        return response
    }

    /**
     * Update the list of possible tab options and select (focus on)
     * the appropriate option.
     */
    private async reactToTabChanges(): Promise<void> {
        // const prevOptions = this.options
        await this.updateOptions(this.lastExstr)

        // TODO: update this from Tab.ts for TabAll.ts
        // if (!prevOptions || !this.options || !this.lastFocused) return

        // // Determine which option to focus on
        // const diff = R.differenceWith(
        //     (x, y) => x.tab.id === y.tab.id,
        //     prevOptions,
        //     this.options,
        // )
        // const lastFocusedTabCompletion = this
        //     .lastFocused as TabAllCompletionOption

        // // If the focused option was removed then focus on the next option
        // if (
        //    diff.length === 1 &&
        //    diff[0].tab.id === lastFocusedTabCompletion.tab.id
        // ) {
        //    //this.select(this.getTheNextTabOption(lastFocusedTabCompletion))
        // }
    }

    /**
     * Gets the next option in this BufferCompletionSource assuming
     * that this BufferCompletionSource length has been reduced by 1
     *
     * TODO: this ain't going to work, need to work out position based on win.tab
     */
    // private getTheNextTabOption(option: TabAllCompletionOption) {
    //     if (option.tab.index === this.options.length) {
    //         return this.options[this.options.length - 1]
    //     }
    //     return this.options[option.tab.index]
    // }

    // Eslint doesn't like this decorator but there's nothing we can do about it
    // eslint-disable-next-line @typescript-eslint/member-ordering
    @Perf.measuredAsync
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

        const tabsPromise = browserBg.tabs.query({})
        const windowsPromise = this.getWindows()
        const [tabs, windows] = await Promise.all([tabsPromise, windowsPromise])

        const options = []

        tabs.sort((a, b) => {
            if (a.windowId === b.windowId) return a.index - b.index
            return a.windowId - b.windowId
        })

        // Window Ids don't make sense so we're using LASTID and WININDEX to compute a window index
        // This relies on the fact that tabs are sorted by window ids
        let lastId = 0
        let winindex = 0
        for (const tab of tabs) {
            if (lastId !== tab.windowId) {
                lastId = tab.windowId
                winindex += 1
            }
            options.push(
                new TabAllCompletionOption(
                    tab.id.toString(),
                    tab,
                    winindex,
                    await Containers.getFromId(tab.cookieStoreId),
                    windows[tab.windowId].incognito,
                ),
            )
        }

        this.completion = undefined
        this.options = options
        return this.updateChain()
    }
}
