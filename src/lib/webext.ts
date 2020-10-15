import * as convert from "@src/lib/convert"
import browserProxy from "@src/lib/browser_proxy"
import * as config from "@src/lib/config"
import * as UrlUtil from "@src/lib/url_util"

export function inContentScript() {
    return getContext() === "content"
}

export function getTriVersion() {
    const manifest = browser.runtime.getManifest()
    return manifest.version_name
}

export function getPrettyTriVersion() {
    const manifest = browser.runtime.getManifest()
    return manifest.name + " " + getTriVersion()
}

export function notBackground() {
    return getContext() !== "background"
}

/** WebExt code can be run from three contexts:

    Content script
    Extension page
    Background page
*/
export function getContext() {
    if (!browser.tabs) {
        return "content"
    } else if (
        browser.runtime.getURL("_generated_background_page.html") ===
        window.location.href
    ) {
        return "background"
    } else {
        return "extension"
    }
}

// Make this library work for both content and background.
export const browserBg = inContentScript() ? browserProxy : browser

/** The first active tab in the currentWindow.
 *
 * TODO: Highlander theory: Can there ever be more than one?
 *
 */
export async function activeTab() {
    return (
        await browserBg.tabs.query({
            active: true,
            currentWindow: true,
        })
    )[0]
}

export async function activeTabId() {
    return (await activeTab()).id
}

/**
 * Return the active window's id.
 *
 */
export async function activeWindowId() {
    return (await browserBg.windows.getCurrent()).id
}

export async function removeActiveWindowValue(value) {
    browserBg.sessions.removeWindowValue(
        await activeWindowId(),
        value,
    )
}

export async function activeTabContainerId() {
    return (await activeTab()).cookieStoreId
}

export async function ownTab() {
    // Warning: this relies on the owntab_background listener being set in messaging.ts in order to work
    return browser.runtime.sendMessage({ type: "owntab_background" })
}

export async function ownTabId() {
    return (await ownTab()).id
}

async function windows() {
    return (await browserBg.windows.getAll())
        .map(w => w.id)
        .sort((a, b) => a - b)
}

/* Returns Tridactyl's window index. */
export async function ownWinTriIndex() {
    return (await windows()).indexOf((await ownTab()).windowId)
}

/* Returns mozilla's internal window id from Tridactyl's index. */
export async function getWinIdFromIndex(index: string) {
    return (await windows())[index]
}

export async function ownTabContainer() {
    return browserBg.contextualIdentities.get((await ownTab()).cookieStoreId)
}

export async function activeTabContainer() {
    const containerId = await activeTabContainerId()
    if (containerId !== "firefox-default")
        return browserBg.contextualIdentities.get(containerId)
    else
        throw new Error(
            "firefox-default is not a valid contextualIdentity (activeTabContainer)",
        )
}

/** Compare major firefox versions */
export async function firefoxVersionAtLeast(desiredmajor: number) {
    const versionstr = (await browserBg.runtime.getBrowserInfo()).version
    const actualmajor = convert.toNumber(versionstr.split(".")[0])
    return actualmajor >= desiredmajor
}

/** Simpler tabs.create option.

    If related = true && relatedopenpos = 'related' then open a new tab with
    some URL as if that URL had been middle clicked on the current tab. If
    relatedopenpos = 'next', open it as the next tab. If 'last', open it last
    and don't tell Firefox who opened it.

    Similarly for tabopenpos, but only tell FF that the newtab is related to
    the activeTab if tabopenpos == 'related'.

    i.e. place that tab just after the current tab and set openerTabId
*/
export async function openInNewTab(
    url: string,
    kwargs: { active?; related?; cookieStoreId? } = {
        active: true,
        related: false,
        cookieStoreId: undefined,
    },
) {
    const thisTab = await activeTab()
    const options: Parameters<typeof browser.tabs.create>[0] = {
        active: false,
        url,
        cookieStoreId: kwargs.cookieStoreId,
    }

    // Be nice to behrmann, #342
    let pos
    if (kwargs.related) pos = config.get("relatedopenpos")
    else pos = config.get("tabopenpos")
    switch (pos) {
        case "next":
            options.index = thisTab.index + 1
            if (kwargs.related && (await firefoxVersionAtLeast(57)))
                options.openerTabId = thisTab.id
            break
        case "last":
            // Infinity can't be serialised, apparently.
            options.index = (
                await browserBg.tabs.query({
                    currentWindow: true,
                })
            ).length
            break
        case "related":
            if (await firefoxVersionAtLeast(57)) {
                options.openerTabId = thisTab.id
            } else {
                options.index = thisTab.index + 1
            }
            break
    }

    if (kwargs.active === false) {
        // load in background
        return browserBg.tabs.create(options)
    } else {
        // load in background and then activate, per issue #1993
        return browserBg.tabs
            .create(options)
            .then(newtab => browserBg.tabs.update(newtab.id, { active: true }))
    }
}

// lazily copied from excmds.ts' winopen - forceURI really ought to be moved to lib/webext
// Should consider changing interface of this to match openInNewTab or vice versa
export function openInNewWindow(createData = {}) {
    browserBg.windows.create(createData)
}

// Returns object if we should use the search engine instead
export async function queryAndURLwrangler(
    query: string[],
): Promise<string | { engine?: string; query: string }> {
    let address = query.join(" ")

    if (address === "") {
        address = config.get("newtab")
    }

    // Special ritual for about:newtab: we can access it but only if we don't ask for it
    if (address === "about:newtab") {
        return undefined
    }

    const index = address.indexOf(" ")
    let firstWord = address
    if (index > -1) firstWord = address.substr(0, index)

    if (firstWord === "") {
        // No query, no newtab set, the user is asking for Tridactyl's newtab page, which we deal with in :tabopen / :open directly
        return undefined
    }

    // Perhaps the user typed a URL?
    if (/^[a-zA-Z0-9+.-]+:[^\s:]/.test(address)) {
        try {
            return new URL(address).href
        } catch (e) {
            // Not a problem, we'll treat address as a regular search query
        }
    }

    // `+ 1` because we want to get rid of the space
    const rest = address.substr(firstWord.length + 1)
    const searchurls = config.get("searchurls")
    if (searchurls[firstWord]) {
        const url = UrlUtil.interpolateSearchItem(
            new URL(searchurls[firstWord]),
            rest,
        )
        // firstWord is a searchurl, so let's use that
        return url.href
    }

    const searchEngines = await browserBg.search.get()
    let engine = searchEngines.find(engine => engine.alias === firstWord)
    // Maybe firstWord is the name of a firefox search engine?
    if (engine !== undefined) {
        return { engine: engine.name, query: rest }
    }

    // Maybe it's a domain without protocol
    try {
        const url = new URL("http://" + address)
        // Ignore unlikely domains
        if (url.hostname.includes(".") || url.port || url.password) {
            return url.href
        }
    } catch (e) {}

    // Let's default to the user's search engine then

    // if firstWord is "search", remove it from the query.
    // This allows users to search for a URL or a word they defined as searchurl
    let queryString = address
    if (firstWord === "search") {
        queryString = rest
    }

    const enginename = config.get("searchengine")
    // firstWord is neither a searchurl nor a search engine, let's see if a search engine has been defined in Tridactyl
    if (enginename) {
        if (searchurls[enginename]) {
            const url = UrlUtil.interpolateSearchItem(
                new URL(searchurls[enginename]),
                queryString,
            )
            return url.href
        }

        engine = searchEngines.find(engine => engine.alias === enginename)
        if (engine !== undefined) {
            return { engine: engine.name, query: queryString }
        }
    }

    // No search engine has been defined in Tridactyl, let's use firefox's default search engine
    return { query: queryString }
}

export async function openInTab(tab, opts = {}, strarr: string[]) {
    const maybeURL = await queryAndURLwrangler(strarr)
    if (typeof maybeURL === "string") {
        return browserBg.tabs.update(
            tab.id,
            Object.assign({ url: maybeURL }, opts),
        )
    }
    if (typeof maybeURL === "object") {
        return browserBg.search.search({ tabId: tab.id, ...maybeURL })
    }

    // Fall back to our new tab page
    return browserBg.tabs.update(
        tab.id,
        Object.assign({ url: "/static/newtab.html" }, opts),
    )
}
