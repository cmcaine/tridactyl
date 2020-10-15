import {
    activeTabId,
    activeWindowId,
    browserBg,
    removeActiveWindowValue,
} from "./webext"

/**
 * Return a set of the current window's tab groups (empty if there are none).
 *
 */
export async function tgroups() {
    const groups = await browserBg.sessions.getWindowValue(
        await activeWindowId(),
        "tridactyl-tgroups",
    )
    return new Set<string>(groups as string[])
}

/**
 * Set the current window's tab groups.
 *
 * @param groups The set of groups.
 *
 */
export async function setTgroups(groups: Set<string>) {
    return browserBg.sessions.setWindowValue(
        await activeWindowId(),
        "tridactyl-tgroups",
        [...groups],
    )
}

/**
 * Clear the current window's tab groups.
 *
 */
export function clearTgroups() {
    removeActiveWindowValue("tridactyl-tgroups")
}

/**
 * Return the active tab group for the a window or undefined.
 *
 * @param id The id of the window. Use the current window if not specified.
 *
 */
export async function windowTgroup(id?: number) {
    if (id === undefined) {
        id = await activeWindowId()
    }
    return (browserBg.sessions.getWindowValue(
        id,
        "tridactyl-active-tgroup",
    ) as unknown) as string
}

/**
 * Set the active tab group for a window.
 *
 * @param name The name of the new active tab group.
 * @param id The id of the window. Use the current window if not specified.
 *
 */
export async function setWindowTgroup(name: string, id?: number) {
    if (id === undefined) {
        id = await activeWindowId()
    }
    return browserBg.sessions.setWindowValue(
        id,
        "tridactyl-active-tgroup",
        name,
    )
}

/**
 * Clear the active tab group for the current window.
 *
 */
export function clearWindowTgroup() {
    return removeActiveWindowValue("tridactyl-active-tgroup")
}

/**
 * Return a tab's tab group.
 *
 * @param id The id of the tab. Use the current tab if not specified.
 *
 */
export async function tabTgroup(id?: number) {
    if (id === undefined) {
        id = await activeTabId()
    }
    return (browserBg.sessions.getTabValue(
        id,
        "tridactyl-tgroup",
    ) as unknown) as string
}

/**
 * Return a list of tab ids.
 *
 * @param id An id, a list of ids, or undefined.
 *
 * If id is undefined, return a list of the current tab id.
 *
 */
async function tabIdsOrCurrent(ids?: number | number[]): Promise<number[]> {
    if (!ids) {
        ids = [await activeTabId()]
    } else if (!Array.isArray(ids)) {
        ids = [ids]
    }
    return ids
}

/**
 * Set the a tab's tab group.
 *
 * @param name The name of the tab group.
 * @param id The id(s) of the tab(s). Use the current tab if not specified.
 *
 */
export async function setTabTgroup(name: string, id?: number | number[]) {
    const ids = await tabIdsOrCurrent(id)
    return Promise.all(
        ids.map(id => {
            browserBg.sessions.setTabValue(id, "tridactyl-tgroup", name)
        }),
    )
}

/**
 * Clear all the tab groups.
 *
 * @param id The id(s) of the tab(s). Use the current tab if not specified.
 *
 */
export async function clearTabTgroup(id?: number | number[]) {
    const ids = await tabIdsOrCurrent(id)
    return Promise.all(
        ids.map(id => {
            browserBg.sessions.removeTabValue(id, "tridactyl-tgroup")
        }),
    )
}

/**
 * Return a list of all tabs in a tab group.
 *
 * @param name The name of the tab group.
 * @param other Whether to return the tabs not in the tab group instead.
 * @param id The id of the window. Use the current window if not specified.
 *
 */
export async function tgroupTabs(
    name: string,
    other: boolean = false,
    id?: number,
): Promise<browser.tabs.Tab[]> {
    if (id === undefined) {
        id = await activeWindowId()
    }
    return browserBg.tabs.query({ windowId: id }).then(async tabs => {
        const sameGroupIndices = await Promise.all(
            tabs.map(async ({ id }) => {
                const groupMatched = (await tabTgroup(id)) == name
                return other ? !groupMatched : groupMatched
            }),
        )
        tabs = tabs.filter((_, index) => sameGroupIndices[index])
        return tabs
    })
}

/**
 * Return the id of the last selected tab in a tab group.
 *
 * @param name The name of the tab group.
 * @param previous Whether to return the tab selected before the last tab.
 *
 */
export async function tgroupLastTabId(name: string, previous: boolean = false) {
    const tabs = await tgroupTabs(name)
    tabs.sort((a, b) => b.lastAccessed - a.lastAccessed)
    if (previous) {
        return tabs[1].id
    } else {
        return tabs[0].id
    }
}

/**
 * Clear stored information for a tab group.
 *
 * @param name The name of the tab group.
 * @param newName A name to rename the group to.
 * @param id The id of the window. Use the current window if not specified.
 *
 * If newName is specified, add it as a stored group (if it doesn't already
 * exist), set the current window group to it, and set the group for all tabs in
 * the old group to it.
 *
 */
export async function tgroupClearOldInfo(
    oldName: string,
    newName?: string,
    id?: number,
) {
    const promises = []
    const groups = await tgroups()
    groups.delete(oldName)
    if (newName) {
        groups.add(newName)
    }
    promises.push(setTgroups(groups))

    if (id === undefined) {
        id = await activeWindowId()
    }

    if (newName) {
        promises.push(setWindowTgroup(newName, id))
        promises.push(
            tgroupTabs(oldName, false, id).then(tabs => {
                setTabTgroup(
                    newName,
                    tabs.map(tab => tab.id),
                )
            }),
        )
    }
    return Promise.all(promises)
}

/**
 * Activate the previously active tab in a tab group.
 *
 * @param name The name of the tab group to switch to.
 *
 */
export async function tgroupActivate(name: string) {
    const lastActiveTabId = await tgroupLastTabId(name)
    // this will trigger tgroupHandleTabActivated
    return browserBg.tabs.update(lastActiveTabId, { active: true })
}

/**
 * Activate the last active tab in the last active tab group.
 *
 * Return the name of activated tab group.
 *
 */
export async function tgroupActivateLast() {
    const otherGroupsTabs = await tgroupTabs(await windowTgroup(), true)
    otherGroupsTabs.sort((a, b) => b.lastAccessed - a.lastAccessed)
    const lastTabId = otherGroupsTabs[0].id
    return browserBg.tabs
        .update(lastTabId, { active: true })
        .then(() => tabTgroup(lastTabId))
}

/**
 * Clear all stored tab group information.
 *
 */
export async function clearAllTgroupInfo() {
    return Promise.all([
        clearTgroups(),
        clearWindowTgroup(),
        browser.tabs.query({ currentWindow: true }).then(async tabs => {
            const ids = tabs.map(tab => tab.id)
            await browser.tabs.show(ids)
            return clearTabTgroup(ids)
        }),
    ])
}

/**
 * Set the tab's tab group to its window's active tab group if there is one.
 *
 * Do nothing if the tab is already associated with a tab group.
 *
 * @param tab The tab that was just created.
 *
 */
export async function tgroupHandleTabCreated(tab: browser.tabs.Tab) {
    const windowGroup = await windowTgroup(tab.windowId)

    if (windowGroup) {
        const tabGroup = await tabTgroup(tab.id)
        if (!tabGroup) {
            return setTabTgroup(windowGroup, tab.id)
        }
    }
}

/**
 * Set the tab's tab group to its window's active tab group if there is one.
 *
 * @param tabId The id of the tab that was just attached to this window.
 *
 */
export async function tgroupHandleTabAttached(tabId: number, attachInfo) {
    // NOTE this doesn't need to worry about a tab on another window previously
    // being pinned because tabs become unpinned when you move them between
    // windows
    const windowGroup = await windowTgroup(attachInfo.newWindowId)
    if (windowGroup) {
        return setTabTgroup(windowGroup, tabId)
    }
}

/**
 * Handle tab activation, possibly switching tab groups.
 *
 * If the new tab is from a different tab group, set it as the new tab group,
 * show all its tabs, and hide all tabs from the old tab group.
 */
export async function tgroupHandleTabActivated(activeInfo) {
    const windowGroup = await windowTgroup(activeInfo.windowId)
    const tabGroup = await tabTgroup(activeInfo.tab)
    const promises = []
    if (windowGroup && tabGroup && windowGroup != tabGroup) {
        await setWindowTgroup(tabGroup, activeInfo.windowId)

        promises.push(
            tgroupTabs(tabGroup, false, activeInfo.windowId).then(tabs => {
                return browserBg.tabs.show(tabs.map(tab => tab.id))
            }),
        )
        promises.push(
            tgroupTabs(tabGroup, true, activeInfo.windowId).then(tabs => {
                return browserBg.tabs.hide(tabs.map(tab => tab.id))
            }),
        )
    }
    return Promise.all(promises)
}

/**
 * Set or clear a tab's group if it was pinned or unpinned respectively.
 *
 * @param tabId The id of the tab that was just updated.
 *
 */
export async function tgroupHandleTabUpdated(
    tabId: number,
    changeInfo,
    tab: browser.tabs.Tab,
) {
    if (changeInfo.pinned !== undefined) {
        const windowGroup = await windowTgroup(tab.windowId)
        if (windowGroup) {
            if (changeInfo.pinned) {
                return clearTabTgroup(tabId)
            } else {
                return setTabTgroup(windowGroup, tabId)
            }
        }
    }
}

/**
 * Handle the last tab in a tab group being closed.
 *
 * Clear its information.
 *
 */
export async function tgroupHandleTabRemoved(_tabId: number, removeInfo) {
    if (!removeInfo.isWindowClosing) {
        const windowGroup = await windowTgroup(removeInfo.windowId)
        const tabCount = await tgroupTabs(
            windowGroup,
            false,
            removeInfo.windowId,
        ).then(tabs => tabs.length)
        if (tabCount == 0) {
            return tgroupClearOldInfo(
                windowGroup,
                undefined,
                removeInfo.windowId,
            )
        }
    }
}

/**
 * Handle the last tab in a tab group being moved to another window.
 *
 * Clear its information.
 *
 */
export async function tgroupHandleTabDetached(tabId: number, detachInfo) {
    // clear tab's stored group; will automatically be changed if there are
    // groups on the other window but otherwise it will still show up in the
    // mode indicator
    clearTabTgroup(tabId)

    const windowGroup = await windowTgroup(detachInfo.oldWindowId)
    const tabCount = await tgroupTabs(
        windowGroup,
        false,
        detachInfo.oldWindowId,
    ).then(tabs => tabs.length)
    if (tabCount == 0) {
        return tgroupClearOldInfo(
            windowGroup,
            undefined,
            detachInfo.oldWindowId,
        )
    }
}
