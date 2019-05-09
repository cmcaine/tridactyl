import * as convert from "@src/lib/convert"
import browserProxy from "@src/lib/browser_proxy"
import * as config from "@src/lib/config"
import * as UrlUtil from "@src/lib/url_util"

export function inContentScript() {
    return getContext() === "content"
}

/** WebExt code can be run from three contexts:

    Content script
    Extension page
    Background page
*/
export function getContext(): "content" | "background" | "extension" {
    if (!("tabs" in browser)) {
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

export let browserBg

// Make this library work for both content and background.
if (inContentScript()) {
    browserBg = browserProxy
} else {
    browserBg = browser
}

/** The first active tab in the currentWindow.
 *
 * TODO: Highlander theory: Can there ever be more than one?
 *
 */
export async function activeTab() {
    return (await browserBg.tabs.query({
        active: true,
        currentWindow: true,
    }))[0]
}

export async function activeTabId() {
    return (await activeTab()).id
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
    const options: any = {
        active: kwargs.active,
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
            options.index = (await browserBg.tabs.query({
                currentWindow: true,
            })).length
            break
        case "related":
            if (await firefoxVersionAtLeast(57)) {
                options.openerTabId = thisTab.id
            } else {
                options.index = thisTab.index + 1
            }
            break
    }

    return browserBg.tabs.create(options)
}

// lazily copied from excmds.ts' winopen - forceURI really ought to be moved to lib/webext
// Should consider changing interface of this to match openInNewTab or vice versa
export async function openInNewWindow(createData = {}) {
    browserBg.windows.create(createData)
}

export async function openInTab(tab, opts = {}, strarr: string[]) {
    let address = strarr.join(" ")

    if (address === "") {
        address = config.get("newtab")
    }

    const index = address.indexOf(" ")
    let firstWord = address
    if (index > -1) firstWord = address.substr(0, index)

    if (firstWord === "") {
        // No query, no newtab set, the user is asking for Tridactyl's newtab page
        return browserBg.tabs.update(
            tab.id,
            Object.assign({ url: "/static/newtab.html" }, opts),
        )
    }

    // Perhaps the user typed a URL?
    if (/^[a-zA-Z0-9+.-]+:[^\s:]/.test(address)) {
        try {
            return browserBg.tabs.update(
                tab.id,
                Object.assign({ url: new URL(address).href }, opts),
            )
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
        return browserBg.tabs.update(
            tab.id,
            Object.assign({ url: url.href }, opts),
        )
    }

    const searchEngines = await browserBg.search.get()
    let engine = searchEngines.find(engine => engine.alias === firstWord)
    // Maybe firstWord is the name of a firefox search engine?
    if (engine !== undefined) {
        return browserBg.search.search({
            tabId: tab.id,
            engine: engine.name,
            query: rest,
        })
    }

    // Maybe it's a domain without protocol
    try {
        const url = new URL("http://" + address)
        // Ignore unlikely domains
        if (url.hostname.includes(".") || url.port || url.password) {
            return browserBg.tabs.update(
                tab.id,
                Object.assign({ url: url.href }, opts),
            )
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
            return browserBg.tabs.update(
                tab.id,
                Object.assign({ url: url.href }, opts),
            )
        }

        engine = searchEngines.find(engine => engine.alias === enginename)
        if (engine !== undefined) {
            return browserBg.search.search({
                tabId: tab.id,
                engine: engine.name,
                query: queryString,
            })
        }
    }

    // No search engine has been defined in Tridactyl, let's use firefox's default search engine
    return browserBg.search.search({ tabId: tab.id, query: queryString })
}
