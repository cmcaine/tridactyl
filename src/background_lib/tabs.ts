import { activeTab, activeTabId } from "@src/lib/webext"
import * as Logging from "@src/lib/logging"

const logger = new Logging.Logger("excmds")

/** Resolve a tab index to the tab id of the corresponding tab in this window.

    @param index
        1-based index of the tab to target. Wraps such that 0 = last tab, -1 =
        penultimate tab, etc.

        also supports # for previous tab, % for current tab.

        if undefined, return activeTabId()
*/
async function idFromIndex(index?: number | "%" | "#" | string): Promise<number> {
    if (index === "#") {
        // Support magic previous/current tab syntax everywhere
        const tabs = await getSortedWinTabs()
        if (tabs.length < 2) {
            // In vim, '#' is the id of the previous buffer even if said buffer has been wiped
            // However, firefox doesn't store tab ids for closed tabs
            // Since vim makes '#' default to the current buffer if only one buffer has ever been opened for the current session, it seems reasonable to return the id of the current tab if only one tab is opened in firefox
            return activeTabId()
        }
        return tabs[1].id
    } else if (index !== undefined && index !== "%") {
        // Wrap
        index = Number(index)
        index = (index - 1).mod((await browser.tabs.query({ currentWindow: true })).length) + 1

        // Return id of tab with that index.
        return (await browser.tabs.query({
            currentWindow: true,
            index: index - 1,
        }))[0].id
    } else {
        return activeTabId()
    }
}

export async function tabSetActive(id: number) {
    return browser.tabs.update(id, { active: true })
}

/** Switch to the tab by index (position on tab bar), wrapping round.

    @param index
        1-based index of the tab to target. Wraps such that 0 = last tab, -1 =
        penultimate tab, etc.

        if undefined, return activeTabId()
*/
export async function tabIndexSetActive(index: number | string) {
    return tabSetActive(await idFromIndex(index))
}

export async function tabduplicate(index?: number) {
    browser.tabs.duplicate(await idFromIndex(index))
}

export async function tabdetach(index?: number) {
    browser.windows.create({ tabId: await idFromIndex(index) })
}

/** Get list of tabs sorted by most recent use
*/
async function getSortedWinTabs(): Promise<browser.tabs.Tab[]> {
    const tabs = await browser.tabs.query({ currentWindow: true })
    tabs.sort((a, b) => (a.lastAccessed < b.lastAccessed ? 1 : -1))
    return tabs
}

export async function tabonly() {
    const tabs = await browser.tabs.query({
        pinned: false,
        active: false,
        currentWindow: true,
    })
    const tabsIds = tabs.map(tab => tab.id)
    browser.tabs.remove(tabsIds)
}

export async function tabnext_gt(index?: number) {
    if (index === undefined) {
        tabnext()
    } else {
        tabIndexSetActive(index)
    }
}

export async function tabnext(increment = 1) {
    return tabprev(-increment)
}

export async function tabprev(increment = 1) {
    // Proper way:
    // return tabIndexSetActive((await activeTab()).index - increment + 1)
    // Kludge until https://bugzilla.mozilla.org/show_bug.cgi?id=1504775 is fixed:
    return browser.tabs.query({ currentWindow: true, hidden: false }).then(tabs => {
        tabs.sort((t1, t2) => t1.index - t2.index)
        const prevTab = (tabs.findIndex(t => t.active) - increment + tabs.length) % tabs.length
        return browser.tabs.update(tabs[prevTab].id, { active: true })
    })
}

export async function tabclose(...indexes: string[]) {
    if (indexes.length > 0) {
        let ids: number[]
        ids = await Promise.all(indexes.map(index => idFromIndex(index)))
        browser.tabs.remove(ids)
    } else {
        // Close current tab
        browser.tabs.remove(await activeTabId())
    }
}

export async function taball(id: string) {
    const windows = (await browser.windows.getAll()).map(w => w.id).sort((a, b) => a - b)
    if (id === null || id === undefined || !id.match(/\d+\.\d+/)) {
        const tab = await activeTab()
        const prevId = id
        id = windows.indexOf(tab.windowId) + "." + (tab.index + 1)
        logger.info(`taball: Bad tab id: ${prevId}, defaulting to ${id}`)
    }
    const [winindex, tabindex_string] = id.split(".")
    const winid = windows[parseInt(winindex, 10) - 1]
    const tabindex_number = parseInt(tabindex_string, 10) - 1
    const tabid = (await browser.tabs.query({ windowId: winid, index: tabindex_number }))[0].id
    await browser.windows.update(winid, { focused: true })
    return browser.tabs.update(tabid, { active: true })
}

export async function tabclosealltoright() {
    const tabs = await browser.tabs.query({
        pinned: false,
        currentWindow: true,
    })

    const atab = await activeTab()
    const ids = tabs.filter(tab => tab.index > atab.index).map(tab => tab.id)
    browser.tabs.remove(ids)
}

export async function tabclosealltoleft() {
    const tabs = await browser.tabs.query({
        pinned: false,
        currentWindow: true,
    })

    const atab = await activeTab()
    const ids = tabs.filter(tab => tab.index < atab.index).map(tab => tab.id)
    browser.tabs.remove(ids)
}

export async function undo(item = "recent"): Promise<number> {
    const current_win_id: number = (await browser.windows.getCurrent()).id
    const sessions = await browser.sessions.getRecentlyClosed()

    if (item === "tab") {
        const lastSession = sessions.find(s => {
            if (s.tab) return true
        })
        if (lastSession) {
            browser.sessions.restore(lastSession.tab.sessionId)
            return lastSession.tab.id
        }
    } else if (item === "window") {
        const lastSession = sessions.find(s => {
            if (s.window) return true
        })
        if (lastSession) {
            browser.sessions.restore(lastSession.window.sessionId)
            return lastSession.window.id
        }
    } else if (item === "recent") {
        // The first session object that's a window or a tab from this window. Or undefined if sessions is empty.
        const lastSession = sessions.find(s => {
            if (s.window) {
                return true
            } else if (s.tab && s.tab.windowId === current_win_id) {
                return true
            } else {
                return false
            }
        })

        if (lastSession) {
            if (lastSession.tab) {
                browser.sessions.restore(lastSession.tab.sessionId)
                return lastSession.tab.id
            } else if (lastSession.window) {
                browser.sessions.restore(lastSession.window.sessionId)
                return lastSession.window.id
            }
        }
    } else if (!isNaN(parseInt(item, 10))) {
        const sessionId = item
        const session = sessions.find(s => (s.tab || s.window).sessionId === sessionId)
        if (session) {
            browser.sessions.restore(sessionId)
            return (session.tab || session.window).id
        }
    } else {
        throw new Error(`[undo] Invalid argument: ${item}. Must be one of "tab", "window", "recent"`)
    }
    return -1
}

export async function tabmove(index = "$") {
    const aTab = await activeTab()
    const windowTabs = await browser.tabs.query({ currentWindow: true })
    const windowPinnedTabs = await browser.tabs.query({ currentWindow: true, pinned: true })
    const maxPinnedIndex = windowPinnedTabs.length - 1

    let minindex: number
    let maxindex: number

    if (aTab.pinned) {
        minindex = 0
        maxindex = maxPinnedIndex
    } else {
        minindex = maxPinnedIndex + 1
        maxindex = windowTabs.length - 1
    }

    let newindex: number
    let relative = false

    if (index.startsWith("+") || index.startsWith("-")) {
        relative = true
        newindex = Number(index) + aTab.index
    } else if (["end", "$", "0"].includes(index)) {
        newindex = maxindex
    } else if (["start", "^"].includes(index)) {
        newindex = 0
    } else {
        newindex = Number(index) + minindex - 1
    }

    if (newindex > maxindex) {
        if (relative) {
            while (newindex > maxindex) {
                newindex -= maxindex - minindex + 1
            }
        } else newindex = maxindex
    }

    if (newindex < minindex) {
        if (relative) {
            while (newindex < minindex) {
                newindex += maxindex - minindex + 1
            }
        } else newindex = minindex
    }

    browser.tabs.move(aTab.id, { index: newindex })
}

export async function pin() {
    const aTab = await activeTab()
    browser.tabs.update(aTab.id, { pinned: !aTab.pinned })
}

export async function mute(...muteArgs: string[]): Promise<void> {
    let mute = true
    let toggle = false
    let all = false

    const argParse = (args: string[]) => {
        if (args === null) {
            return
        }
        if (args[0] === "all") {
            all = true
            args.shift()
            argParse(args)
        }
        if (args[0] === "unmute") {
            mute = false
            args.shift()
            argParse(args)
        }
        if (args[0] === "toggle") {
            toggle = true
            args.shift()
            argParse(args)
        }
    }

    argParse(muteArgs)

    const updateObj = { muted: false }
    if (mute) {
        updateObj.muted = true
    }
    if (all) {
        const tabs = await browser.tabs.query({ currentWindow: true })
        for (const tab of tabs) {
            if (toggle) {
                updateObj.muted = !tab.mutedInfo.muted
            }
            browser.tabs.update(tab.id, updateObj)
        }
    } else {
        const tab = await activeTab()
        if (toggle) {
            updateObj.muted = !tab.mutedInfo.muted
        }
        browser.tabs.update(tab.id, updateObj)
    }
}
