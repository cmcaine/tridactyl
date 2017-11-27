// '//#' is a start point for a simple text-replacement-type macro. See excmds_macros.py

/** # Tridactyl help page

    Use `:help <excmd>` or scroll down to show [[help]] for a particular excmd.

    The default keybinds can be found [here](/static/docs/modules/_parsers_normalmode_.html#defaultnmaps).

    Tridactyl is in a pretty early stage of development. Please report any issues and make requests for missing features on the GitHub project page [[1]].

    Highlighted features:

    - Press `b` to bring up a list of open tabs in the current window; you can type the tab ID or part of the title or URL to choose a tab (the buffer list doesn't show which one you've selected yet, but it does work)
    - Press `I` to enter ignore mode. `Shift` + `Escape` to return to normal mode.
    - Press `f` to start "hint mode", `F` to open in background
    - Press `o` to `:open` a different page
    - Press `s` if you want to search for something that looks like a domain name or URL
    - [[bind]] new commands with e.g. `:bind J tabnext`
    - Type `:help` to see a list of available excmds
    - Use `yy` to copy the current page URL to your clipboard
    - `]]` and `[[` to navigate through the pages of comics, paginated articles, etc
    - Pressing `ZZ` will close all tabs and windows, but it will only "save" them if your about:preferences are set to "show your tabs and windows from last time"

    There are some caveats common to all webextension vimperator-alikes:

    - Do not try to navigate to any about:\* pages using `:open` as it will fail silently
    - Firefox will not load Tridactyl on addons.mozilla.org, about:\*, some file:\* URIs, view-source:\*, or data:\*. On these pages Ctrl-L (or F6), Ctrl-Tab and Ctrl-W are your escape hatches
    - Tridactyl does not currently support changing/hiding the Firefox GUI, but you can do it yourself by changing your userChrome. There is an example file available on our repository [[2]]

    If you want a more fully-featured vimperator-alike, your best option is Firefox ESR [[3]] and Vimperator :)

    [1]: https://github.com/cmcaine/tridactyl/issues
    [2]: https://github.com/cmcaine/tridactyl/blob/master/src/static/userChrome-minimal.css
    [3]: https://www.mozilla.org/en-US/firefox/organizations/

*/
/** ignore this line */

// {{{ setup

import * as Messaging from "./messaging"
import {l} from './lib/webext'

//#content_omit_line
import "./number.clamp"
//#content_helper
import * as SELF from "./excmds_content"
//#content_helper
Messaging.addListener('excmd_content', Messaging.attributeCaller(SELF))
/** Message excmds_content.ts in the active tab of the currentWindow */
//#background_helper
import {messageActiveTab} from './messaging'

//#background_helper
import "./number.mod"
//#background_helper
import state from "./state"
//#background_helper
import {ModeName} from './state'
//#background_helper
import * as keydown from "./keydown_background"
//#background_helper
import {activeTab, activeTabId, firefoxVersionAtLeast} from './lib/webext'
//#content_helper
import {incrementUrl, getUrlRoot, getUrlParent} from "./url_util"
//#background_helper
import * as CommandLineBackground from './commandline_background'
//#content_helper
import * as DOM from './dom'


/** @hidden */
//#background_helper
export const cmd_params = new Map<string, Map<string, string>>()

const SEARCH_URLS = new Map<string, string>([
    ["google","https://www.google.com/search?q="],
    ["googleuk","https://www.google.co.uk/search?q="],
    ["bing","https://www.bing.com/search?q="],
    ["duckduckgo","https://duckduckgo.com/?q="],
    ["yahoo","https://search.yahoo.com/search?p="],
    ["twitter","https://twitter.com/search?q="],
    ["wikipedia","https://en.wikipedia.org/wiki/Special:Search/"],
    ["youtube","https://www.youtube.com/results?search_query="],
    ["amazon","https://www.amazon.com/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords="],
    ["amazonuk","https://www.amazon.co.uk/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords="],
    ["startpage","https://www.startpage.com/do/search?query="],
    ["github","https://github.com/search?utf8=✓&q="],
    ["searx","https://searx.me/?category_general=on&q="],
    ["cnrtl","http://www.cnrtl.fr/lexicographie/"],
    ["osm","https://www.openstreetmap.org/search?query="],
    ["mdn","https://developer.mozilla.org/en-US/search?q="],
    ["gentoo_wiki","https://wiki.gentoo.org/index.php?title=Special%3ASearch&profile=default&fulltext=Search&search="],
])

// map a page-relation (next or previous) to a fallback pattern to match link texts against
const REL_PATTERN = {
    next: /^(?:next|newer)\b|»|>>/i,
    prev: /^(?:prev(?:ious)?|older)\b|«|<</i,
}

/** @hidden */
function hasScheme(uri: string) {
    return uri.match(/^([\w-]+):/)
}

/** @hidden */
function searchURL(provider: string, query: string) {
    if (SEARCH_URLS.has(provider)) {
        const url = new URL(SEARCH_URLS.get(provider) + encodeURIComponent(query))
        // URL constructor doesn't convert +s because they're valid literals in
        // the standard it adheres to. But they are special characters in
        // x-www-form-urlencoded and e.g. google excepts query parameters in
        // that format.
        url.search = url.search.replace(/\+/g, '%2B')
        return url
    } else {
        throw new TypeError(`Unknown provider: '${provider}'`)
    }
}

/** If maybeURI doesn't have a schema, affix http:// */
/** @hidden */
function forceURI(maybeURI: string): string {
    try {
        return new URL(maybeURI).href
    } catch (e) {
        if (e.name !== 'TypeError') throw e
    }

    // Else if search keyword:
    try {
        const args = maybeURI.split(' ')
        return searchURL(args[0], args.slice(1).join(' ')).href
    } catch (e) {
        console.log(e)
        if (e.name !== 'TypeError') throw e
    }

    // Else if it's a domain or something
    try {
        const url = new URL('http://' + maybeURI)
        // Ignore unlikely domains
        if (url.hostname.includes('.') || url.port || url.password) {
            return url.href
        }
    } catch (e) {
        if (e.name !== 'TypeError') throw e
    }

    // Else search google
    return searchURL('google', maybeURI).href
}

/** @hidden */
//#background_helper
function tabSetActive(id: number) {
    browser.tabs.update(id, {active: true})
}

// }}}


// {{{ PAGE CONTEXT

/** Blur (unfocus) the active element */
//#content
export function unfocus() {
    (document.activeElement as HTMLInputElement).blur()
}

//#content
export function scrollpx(a: number, b: number) {
    window.scrollBy(a, b)
}

/** If one argument is given, scroll to that percentage down the page.
    If two arguments are given, treat as x and y values to give to window.scrollTo
*/
//#content
export function scrollto(a: number, b?: number) {
    a = Number(a)
    // if b is undefined, Number(b) is NaN.
    b = Number(b)
    window.scrollTo(
        b ? a : window.scrollX,
        b
            ? b
            : a.clamp(0, 100) *
              (window.document.scrollingElement.scrollHeight / 100)
    )
}

//#content
export function scrollline(n = 1) {
    window.scrollByLines(n)
}
//#content
export function scrollpage(n = 1) {
    window.scrollBy(0, window.innerHeight * n)
}

/** @hidden */
//#content_helper
function history(n: number) {
    window.history.go(n)
}

/** Navigate forward one page in history. */
//#content
export function forward(n = 1) {
    history(n)
}

/** Navigate back one page in history. */
//#content
export function back(n = 1) {
    history(n * -1)
}

/** Reload the next n tabs, starting with activeTab, possibly bypassingCache */
//#background
export async function reload(n = 1, hard = false) {
    let tabstoreload = await getnexttabs(await activeTabId(), n)
    let reloadProperties = {bypassCache: hard}
    tabstoreload.map(n => browser.tabs.reload(n, reloadProperties))
}

/** Reloads all tabs, bypassing the cache if hard is set to true */
//#background
export async function reloadall(hard = false){
    let tabs = await browser.tabs.query({})
    let reloadprops = {bypassCache: hard}
    tabs.map(tab => browser.tabs.reload(tab.id, reloadprops))
}

/** Reload the next n tabs, starting with activeTab. bypass cache for all */
//#background
export async function reloadhard(n = 1) {
    reload(n, true)
}

/** Open a new page in the current tab.

    @param urlarr
        - if first word looks like it has a schema, treat as a URI
        - else if the first word contains a dot, treat as a domain name
        - else if the first word is a key of [[SEARCH_URLS]], treat all following terms as search parameters for that provider
        - else treat as search parameters for google
*/
//#content
export function open(...urlarr: string[]) {
    let url = urlarr.join(" ")
    window.location.href = forceURI(url)
}

/** Show this page.

    `:help <excmd>` jumps to the entry for that command.

    e.g. `:help bind`
*/
//#background
export async function help(excmd?: string) {
    const docpage = browser.extension.getURL("static/docs/modules/_excmds_.html#")
    if (excmd === undefined) excmd = "tridactyl-help-page"
    if ((await activeTab()).url.startsWith(docpage)) {
        open(docpage + excmd)
    } else {
        tabopen(docpage + excmd)
    }
}

/** @hidden */
// Find clickable next-page/previous-page links whose text matches the supplied pattern,
// and return the last such link.
//
// If no matching link is found, return null.
//
// We return the last link that matches because next/prev buttons tend to be at the end of the page
// whereas lots of blogs have "VIEW MORE" etc. plastered all over their pages.
function findRelLink(pattern: RegExp): HTMLAnchorElement | null {
    const links = <NodeListOf<HTMLAnchorElement>>document.querySelectorAll('a[href]')

    let lastLink = null

    for (const link of links) {
        // `innerText` gives better (i.e. less surprising) results than `textContent`
        // at the expense of being much slower, but that shouldn't be an issue here
        // as it's a one-off operation that's only performed when we're leaving a page
        if (pattern.test(link.innerText)) {
            lastLink = link
        }
    }

    return lastLink
}

/** @hidden */
// Return the last element in the document matching the supplied selector,
// or null if there are no matches.
function selectLast(selector: string): HTMLElement | null {
    const nodes = <NodeListOf<HTMLElement>>document.querySelectorAll(selector)
    return nodes.length ? nodes[nodes.length - 1] : null
}

/** Find a likely next/previous link and follow it
 *
 * @param rel   the relation of the target page to the current page: "next" or "prev"
 */
//#content
export function followpage(rel: 'next'|'prev' = 'next') {
    const link = <HTMLLinkElement>selectLast(`link[rel~=${rel}][href]`)

    if (link) {
        window.location.href = link.href
        return
    }

    const anchor = <HTMLAnchorElement>selectLast(`a[rel~=${rel}][href]`) ||
        findRelLink(REL_PATTERN[rel])

    if (anchor) {
        anchor.click()
    }
}

/** Increment the current tab URL
 *
 * @param count   the increment step, can be positive or negative
*/
//#content
export function urlincrement(count = 1){
    let newUrl = incrementUrl(window.location.href, count)

    if (newUrl !== null) {
        window.location.href = newUrl
    }
}

/** Go to the root domain of the current URL
 */
//#content
export function urlroot (){
    let rootUrl = getUrlRoot(window.location)

    if (rootUrl !== null) {
        window.location.href = rootUrl.href
    }
}

/** Go to the parent URL of the current tab's URL
 */
//#content
export function urlparent (){
    let parentUrl = getUrlParent(window.location)

    if (parentUrl !== null) {
        window.location.href = parentUrl.href
    }
}

/** Returns the url of links that have a matching rel.
 */
//#content
export function geturlsforlinks(rel: string){
    let elems = document.querySelectorAll("link[rel='" + rel + "']") as NodeListOf<HTMLLinkElement>
    console.log(rel, elems)
    if (elems)
        return Array.prototype.map.call(elems, x => x.href)
    return []
}

//#background
export function zoom(level=0){
    level = level > 3 ? level / 100 : level
    browser.tabs.setZoom(level)
}

//#background
export async function reader() {
    if (await l(firefoxVersionAtLeast(58))) {
	let aTab = await activeTab()
	if (aTab.isArticle) {
	    browser.tabs.toggleReaderMode()
	} // else {
	//  // once a statusbar exists an error can be displayed there
	// }
    }
}

/** The kinds of input elements that we want to be included in the "focusinput"
 * command (gi)
 */
export const INPUTTAGS_selectors = `
input:not([disabled]):not([readonly]):-moz-any(
 :not([type]),
 [type='text'],
 [type='search'],
 [type='password'],
 [type='datetime'],
 [type='datetime-local'],
 [type='date'],
 [type='month'],
 [type='time'],
 [type='week'],
 [type='number'],
 [type='range'],
 [type='email'],
 [type='url'],
 [type='tel'],
 [type='color']
),
textarea:not([disabled]):not([readonly]),
object,
[role='application']
`

/** Password field selectors */
const INPUTPASSWORD_selectors = `
input[type='password']
`

/** DOM reference to the last used Input field
 */
//#content_helper
let LAST_USED_INPUT: HTMLElement = null


/** Focus the last used input on the page
 *
 * @param nth   focus the nth input on the page, or "special" inputs:
 *                  "-l": last focussed input
 *                  "-p": first password field
 *                  "-b": biggest input field
 */
//#content
export function focusinput(nth: number|string) {

    let inputToFocus: HTMLElement = null

    // set to false to avoid falling back on the first available input
    // if a special finder fails
    let fallbackToNumeric = true

    // nth = "-l" -> use the last used input for this page
    if (nth === "-l") {
        // try to recover the last used input stored as a
        // DOM node, which should be exactly the one used before (or null)
        inputToFocus = LAST_USED_INPUT

        // failed to find that? - look up in sessionStorage?
        // will need to serialise the last used input to a string that
        // we can look up in future (tabindex, selector?), perhaps along with
        // a way to remember the page it was on?
    }
    else if (nth === "-p") {
        // attempt to find a password input
        fallbackToNumeric = false

        let inputs = DOM.getElemsBySelector(INPUTPASSWORD_selectors,
                                            DOM.isSubstantial)

        if (inputs.length) {
            inputToFocus = <HTMLElement>inputs[0]
        }
    }
    else if (nth === "-b") {

        let inputs = DOM.getElemsBySelector(INPUTTAGS_selectors,
            DOM.isSubstantial) as HTMLElement[]

        inputToFocus = inputs.sort(DOM.compareElementArea).slice(-1)[0]
    }

    // either a number (not special) or we failed to find a special input when
    // asked and falling back is acceptable
    if (!inputToFocus  && fallbackToNumeric) {

        let index = isNaN(<number>nth) ? 0 : <number>nth
        inputToFocus = DOM.getNthElement(INPUTTAGS_selectors,
                                         index, DOM.isSubstantial)
    }

    if (inputToFocus) inputToFocus.focus()
}

// Store the last focused element
//#content_helper
document.addEventListener("focusin",e=>{if (DOM.isTextEditable(e.target as HTMLElement)) LAST_USED_INPUT = e.target as HTMLElement})

// }}}

// {{{ TABS

/** Switch to the tab by index (position on tab bar), wrapping round.

    Note: all internal indices should start at 0.
 */
/** @hidden */
//#background_helper
async function tabindex(index: number) {
    // Get an array of tabs in the current window
    let current_window = await browser.windows.getCurrent()
    let tabs = await browser.tabs.query({windowId: current_window.id})

    // Find and switch to the tab with that index
    let desiredTab = tabs.find((tab: any) => {
        return tab.index === index.mod(tabs.length)
    })
    tabSetActive(desiredTab.id)
}

/** Switch to the next tab, wrapping round.

    If increment is specified, move that many tabs forwards.
 */
//#background
export async function tabnext(increment = 1) {
    tabindex((await activeTab()).index + increment)
}

/** Switch to the previous tab, wrapping round.

    If increment is specified, move that many tabs backwards.
 */
//#background
export async function tabprev(increment = 1) {
    tabindex((await activeTab()).index - increment)
}

/** Switch to the first tab. */
//#background
export async function tabfirst() {
    tabindex(0)
}

/** Switch to the last tab. */
//#background
export async function tablast() {
    tabindex(-1)
}

/** Like [[open]], but in a new tab */
//#background
export async function tabopen(...addressarr: string[]) {
    let uri
    let address = addressarr.join(' ')
    if (address != "") uri = forceURI(address)
    browser.tabs.create({url: uri})
}

//#background
export async function tabduplicate(id?: number){
    id = id ? id : (await activeTabId())
    browser.tabs.duplicate(id)
}

//#background
export async function tabdetach(id?: number){
    id = id ? id : (await activeTabId())
    browser.windows.create({tabId: id})
}

//#background
export async function tabclose(ids?: number[] | number) {
    if (ids !== undefined) {
        browser.tabs.remove(ids)
    } else {
        // Close the current tab
        browser.tabs.remove(await activeTabId())
    }
}

/** restore most recently closed tab in this window unless the most recently closed item was a window */
//#background
export async function undo(){
    const current_win_id : number = (await browser.windows.getCurrent()).id
    const sessions = await browser.sessions.getRecentlyClosed()

    // The first session object that's a window or a tab from this window. Or undefined if sessions is empty.
    let closed = sessions.find((s) => {
        return ('window' in s || s.tab && (s.tab.windowId == current_win_id))
    })
    if (closed) {
        if (closed.tab) {
            browser.sessions.restore(closed.tab.sessionId)
        }
        else if (closed.window) {
            browser.sessions.restore(closed.window.sessionId)
        }
    }
}

//#background
export async function tabmove(n?: string) {
    let aTab = await activeTab(),
        m: number
    if (!n) {
        browser.tabs.move(aTab.id, {index: -1})
        return
    } else if (n.startsWith("+") || n.startsWith("-")) {
        m = Math.max(0, Number(n) + aTab.index)
    } else m = Number(n)
    browser.tabs.move(aTab.id, {index: m})
}

/** Pin the current tab */
//#background
export async function pin() {
    let aTab = await activeTab()
    browser.tabs.update(aTab.id, {pinned: !aTab.pinned})
}

// }}}

// {{{ WINDOWS

/** Like [[open]], but in a new window */
//#background
export async function winopen(...args: string[]) {
    let address: string
    const createData = {}
    if (args[0] === "-private") {
        createData["incognito"] = true
        address = args.slice(1,args.length).join(' ')
    } else address = args.join(' ')
    createData["url"] = address != "" ? forceURI(address) : null
    browser.windows.create(createData)
}

//#background
export async function winclose() {
    browser.windows.remove((await browser.windows.getCurrent()).id)
}


/** Close all windows */
// It's unclear if this will leave a session that can be restored.
// We might have to do it ourselves.
//#background
export async function qall(){
    let windows = await browser.windows.getAll()
    windows.map((window) => browser.windows.remove(window.id))
}

// }}}

// {{{ MISC

/** Deprecated */
//#background
export function suppress(preventDefault?: boolean, stopPropagation?: boolean) {
    mode("ignore")
}

//#background
export function version(){
    clipboard("yank","REPLACE_ME_WITH_THE_VERSION_USING_SED")
    fillcmdline_notrail("REPLACE_ME_WITH_THE_VERSION_USING_SED")

}

/** Example:
        - `mode ignore` to ignore all keys.
*/
//#background
export function mode(mode: ModeName) {
    // TODO: event emition on mode change.
    if (mode === "hint") {
        hint()
    } else {
        state.mode = mode
    }
}

//#background_helper
async function getnexttabs(tabid: number, n?: number) {
    const curIndex: number = (await browser.tabs.get(tabid)).index
    const tabs: browser.tabs.Tab[] = await browser.tabs.query({
        currentWindow: true,
    })
    const indexFilter = ((tab: browser.tabs.Tab) => {
        return (
            curIndex <= tab.index &&
            (n ? tab.index < curIndex + Number(n) : true)
        )
    }).bind(n)
    return tabs.filter(indexFilter).map((tab: browser.tabs.Tab) => {
        return tab.id
    })
}

// Moderately slow; should load in results as they arrive, perhaps
// Todo: allow jumping to buffers once they are found
// Consider adding to buffers with incremental search
//      maybe only if no other results in URL etc?
// Find out how to return context of each result
//#background
/* export async function findintabs(query: string) { */
/*     const tabs = await browser.tabs.query({currentWindow: true}) */
/*     console.log(query) */
/*     const findintab = async tab => */
/*         await browser.find.find(query, {tabId: tab.id}) */
/*     let results = [] */
/*     for (let tab of tabs) { */
/*         let result = await findintab(tab) */
/*         if (result.count > 0) { */
/*             results.push({tab, result}) */
/*         } */
/*     } */
/*     results.sort(r => r.result.count) */
/*     console.log(results) */
/*     return results */
/* } */

// }}}

// {{{ CMDLINE

//#background_helper
import * as controller from './controller'

/** Split `cmds` on pipes (|) and treat each as it's own command.

    Workaround: this should clearly be in the parser, but we haven't come up with a good way to deal with |s in URLs, search terms, etc. yet.
*/
//#background
export function composite(...cmds: string[]) {
    cmds = cmds.join(" ").split("|")
    cmds.forEach(controller.acceptExCmd)
}

/** Please use fillcmdline instead */
//#background
export function showcmdline() {
    CommandLineBackground.show()
}

/** Set the current value of the commandline to string *with* a trailing space */
//#background
export function fillcmdline(...strarr: string[]) {
    let str = strarr.join(" ")
    showcmdline()
    messageActiveTab("commandline_frame", "fillcmdline", [str])
}

/** Set the current value of the commandline to string *without* a trailing space */
//#background
export function fillcmdline_notrail(...strarr: string[]) {
    let str = strarr.join(" ")
    let trailspace = false
    showcmdline()
    messageActiveTab("commandline_frame", "fillcmdline", [str, trailspace])
}

/** Equivalent to `fillcmdline_notrail <yourargs><current URL>`

    See also [[fillcmdline_notrail]]
*/
//#background
export async function current_url(...strarr: string[]){
    fillcmdline_notrail(...strarr, (await activeTab()).url)
}

/** Use the system clipboard.

    If `excmd == "open"`, call [[open]] with the contents of the clipboard. Similarly for [[tabopen]].

    If `excmd == "yank"`, copy the current URL, or if given, the value of toYank, into the system clipboard.

    If `excmd == "yankcanon"`, copy the canonical URL of the current page if it exists, otherwise copy the current URL.

    If `excmd == "yankshort"`, copy the shortlink version of the current URL, and fall back to the canonical then actual URL. Known to work on https://yankshort.neocities.org/.

    Unfortunately, javascript can only give us the `clipboard` clipboard, not e.g. the X selection clipboard.

*/
//#background
export async function clipboard(excmd: "open"|"yank"|"yankshort"|"yankcanon"|"tabopen" = "open", ...toYank: string[]) {
    let content = toYank.join(" ")
    let url = ""
    let urls = []
    switch (excmd) {
        case 'yankshort':
            urls = await messageActiveTab("excmd_content", "geturlsforlinks", ["shortlink"]);
            if (urls.length > 0) {
                messageActiveTab("commandline_frame", "setClipboard", [urls[0]])
                break
            }
        case 'yankcanon':
            urls = await messageActiveTab("excmd_content", "geturlsforlinks", ["canonical"]);
            if (urls.length > 0) {
                messageActiveTab("commandline_frame", "setClipboard", [urls[0]])
                break
            }
        case 'yank':
            await messageActiveTab("commandline_content", "focus")
            content = (content == "") ? (await activeTab()).url : content
            messageActiveTab("commandline_frame", "setClipboard", [content])
            break
        case 'open':
            await messageActiveTab("commandline_content", "focus")
            url = await messageActiveTab("commandline_frame", "getClipboard")
            url && open(url)
            break
        case 'tabopen':
            await messageActiveTab("commandline_content", "focus")
            url = await messageActiveTab("commandline_frame", "getClipboard")
            url && tabopen(url)
            break
        default:
            // todo: maybe we should have some common error and error handler
            throw new Error(`[clipboard] unknown excmd: ${excmd}`)
    }
    CommandLineBackground.hide()
}

// {{{ Buffer/completion stuff
// TODO: Move autocompletions out of excmds.
/** Ported from Vimperator. */
//#background
export async function tabs() {
    fillcmdline("buffer")
}
//#background
export async function buffers() {
    tabs()
}

/** Change active tab.

    The buffer index starts at 1.
 */
//#background
export async function buffer(n?: number | string) {
    if (!n)
        return

    if (n === "#") {
        // Switch to the most recently accessed buffer
        tabindex(
            (await browser.tabs.query({currentWindow: true})).sort((a, b) => {
                return a.lastAccessed < b.lastAccessed ? 1 : -1
            })[1].index
        )
    }
    else if (Number.isInteger(Number(n))) {
        // Internal indices start at 0.
        tabindex(Number(n) - 1)
    }
}

/*/1** Set tab with index of n belonging to window with id of m to active *1/ */
/*//#background */
/*export async function bufferall(m?: number, n?: number) { */
/*    // TODO */
/*} */

// }}}

// }}}

// {{{ SETTINGS

/** Bind a sequence of keys to an excmd.

    This is an easier-to-implement bodge while we work on vim-style maps.

    Examples:

        - `bind G fillcmdline tabopen google`
        - `bind D composite tabclose | buffer #`
        - `bind j scrollline 20`
        - `bind F hint -b`

    Use [[composite]] if you want to execute multiple excmds. Use
    [[fillcmdline]] to put a string in the cmdline and focus the cmdline
    (otherwise the string is executed immediately).

    See also:

        - [[unbind]]
        - [[reset]]
*/
//#background
export async function bind(key: string, ...bindarr: string[]){
    let exstring = bindarr.join(" ")
    let nmaps = (await browser.storage.sync.get("nmaps"))["nmaps"]
    nmaps = (nmaps == undefined) ? Object.create(null) : nmaps
    nmaps[key] = exstring
    browser.storage.sync.set({nmaps})
}

/** Unbind a sequence of keys so that they do nothing at all.

    See also:

        - [[bind]]
        - [[reset]]
*/
//#background
export async function unbind(key: string){
    bind(key, "")
}

/** Restores a sequence of keys to their default value.

    See also:

        - [[bind]]
        - [[unbind]]
*/
//#background
export async function reset(key: string){
    let nmaps = (await browser.storage.sync.get("nmaps"))["nmaps"]
    nmaps = (nmaps == undefined) ? {} : nmaps
    delete nmaps[key]
    browser.storage.sync.set({nmaps})
}

/** Bind a quickmark for the current URL to a key.

    Afterwards use go[key], gn[key], or gw[key] to [[open]], [[tabopen]], or
    [[winopen]] the URL respectively.
    
*/
//#background
export async function quickmark(key: string) {
    // ensure we're binding to a single key
    if (key.length !== 1) {
        return
    }

    let address = (await activeTab()).url
    // Have to await these or they race!
    await bind("gn" + key, "tabopen", address)
    await bind("go" + key, "open", address)
    await bind("gw" + key, "winopen", address)
}

// }}}

// {{{ HINTMODE

//#background_helper
import * as hinting from './hinting_background'

/** Hint a page.
*
* Pass -b as first argument to open hinted page in background.
* -y copies the link's target to the clipboard.
* -p copies an element's text to the clipboard.*/
//#background
export function hint(option?: "-b") {
    if (option === '-b') hinting.hintPageOpenInBackground()
    else if (option === "-y") hinting.hintPageYank()
    else if (option === "-p") hinting.hintPageTextYank()
    else if (option === "-i") hinting.hintImage(false)
    else if (option === "-I") hinting.hintImage(true)
    else if (option === "-;") hinting.hintFocus()
    else hinting.hintPageSimple()
}


// }}}

// {{{ GOBBLE mode

//#background_helper
import * as gobbleMode from './parsers/gobblemode'

/** Initialize gobble mode.

    It will read `nChars` input keys, append them to `endCmd` and execute that
    string.

*/
//#background
export async function gobble(nChars: number, endCmd: string) {
    gobbleMode.init(nChars, endCmd)
}

// }}}
//

// unsupported on android
/** Add or remove a bookmark.
*
* Optionally, you may give the bookmark a title. If no URL is given, a bookmark is added for the current page.
* 
* If a bookmark already exists for the URL, it is removed.
*/
//#background
export async function bmark(url?: string, title = ""){
    url = url === undefined ? (await activeTab()).url : url
    let dupbmarks = await browser.bookmarks.search({url})
    dupbmarks.map((bookmark) => browser.bookmarks.remove(bookmark.id))
    if (dupbmarks.length == 0 ) {browser.bookmarks.create({url, title})}
}

// vim: tabstop=4 shiftwidth=4 expandtab
