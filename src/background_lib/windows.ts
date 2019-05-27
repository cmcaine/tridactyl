import { ABOUT_WHITELIST, openInTab } from "@src/lib/webext"
import excmd_open from "@src/lib/generated/open"

// It's unclear if this will leave a session that can be restored.
// We might have to do it ourselves.
export async function closeAllWindows() {
    const windows = await browser.windows.getAll()
    windows.forEach(window => browser.windows.remove(window.id))
}

/**
 * Close a tab.
 *
 * @param id - The window id. Defaults to the id of the current window.
 *
 * Example: `winclose`
 */
export async function closeWindows(...ids: string[]) {
    if (ids.length === 0) {
        ids.push(`${(await browser.windows.getCurrent()).id}`)
    }
    return Promise.all(ids.map(id => browser.windows.remove(parseInt(id, 10))))
}

export async function openTabInWindow(...args: string[]) {
    const createData = {} as any
    let firefoxArgs = "--new-window"
    let done = false
    while (!done) {
        switch (args[0]) {
            case "-private":
                createData.incognito = true
                args = args.slice(1, args.length)
                firefoxArgs = "--private-window"
                break

            case "-popup":
                createData.type = "popup"
                args = args.slice(1, args.length)
                break

            default:
                done = true
                break
        }
    }

    const address = args.join(" ")
    if (!ABOUT_WHITELIST.includes(address) && address.match(/^(about|file):.*/)) {
        return excmd_open.nativeopen(firefoxArgs, address)
    }

    const win = await browser.windows.create(createData)
    openInTab(win.tabs[0], { loadReplace: true }, address.split(" "))
}
