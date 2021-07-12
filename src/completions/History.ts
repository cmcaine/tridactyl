import * as Completions from "@src/completions"
import * as config from "@src/lib/config"
import * as providers from "@src/completions/providers"

class HistoryCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(public value: string, page: browser.history.HistoryItem) {
        super()
        if (!page.title) {
            page.title = new URL(page.url).host
        }

        // Push properties we want to fuzmatch on
        this.fuseKeys.push(page.title, page.url) // weight by page.visitCount

        // Create HTMLElement
        this.html = html`<tr class="HistoryCompletionOption option">
            <td class="prefix">${"".padEnd(2)}</td>
            <td class="title">${page.title}</td>
            <td class="content">
                <a class="url" target="_blank" href=${page.url}>${page.url}</a>
            </td>
        </tr>`
    }
}

export class HistoryCompletionSource extends Completions.CompletionSourceFuse {
    public options: HistoryCompletionOption[]

    constructor(private _parent) {
        super(
            ["open", "tabopen", "winopen"],
            "HistoryCompletionSource",
            "History and bookmarks",
            "History",
        )

        this._parent.appendChild(this.node)
    }

    public async filter(exstr: string) {
        const prevStr = this.lastExstr
        this.lastExstr = exstr
        let [prefix, query] = this.splitOnPrefix(exstr)
        let options = ""

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

        // Ignoring command-specific arguments
        // It's terrible but it's ok because it's just a stopgap until an actual commandline-parsing API is implemented
        if (prefix === "tabopen ") {
            if (query.startsWith("-c")) {
                const args = query.split(" ")
                options = args.slice(0, 2).join(" ")
                query = args.slice(2).join(" ")
            }
            if (query.startsWith("-b")) {
                const args = query.split(" ")
                options = args.slice(0, 1).join(" ")
                query = args.slice(1).join(" ")
            }
        } else if (prefix === "winopen " && query.startsWith("-private")) {
            options = "-private"
            query = query.substring(options.length)
        }
        options += options ? " " : ""

        // Options are pre-trimmed to the right length.
        // Typescript throws an error here - further investigation is probably warranted
        this.options = ((await this.scoreOptions(
            query,
            config.get("historyresults"),
        )) as any).map(
            page => new HistoryCompletionOption(options + page.url, page),
        )

        // Deselect any selected, but remember what they were.
        const lastFocused = this.lastFocused
        this.deselect()

        // Set initial state to normal, unless the option was selected a moment
        // ago, then reselect it so that users don't lose their selections.
        this.options.forEach(option => (option.state = "normal"))
        for (const option of this.options) {
            if (
                lastFocused !== undefined &&
                lastFocused.value === option.value &&
                prevStr.length <= exstr.length
            ) {
                this.select(option)
                break
            }
        }

        return this.updateDisplay()
    }

    // We don't need this inherited function
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    updateChain() {}

    private async scoreOptions(query: string, n: number) {
        if (!query || config.get("historyresults") === 0) {
            return (await providers.getTopSites()).slice(0, n)
        } else {
            return (await providers.getCombinedHistoryBmarks(query)).slice(0, n)
        }
    }
}
