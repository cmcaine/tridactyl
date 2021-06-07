/* eslint-disable spaced-comment */
// '//#' is a start point for a simple text-replacement-type macro. See excmds_macros.py

/** # Tridactyl help page

    Use `:help <excmd>` or scroll down to show [[help]] for a particular excmd. If you're still stuck, you might consider reading through the [:tutor](/static/clippy/1-tutor.html) again.

    The default keybinds and settings can be found [here](/static/docs/classes/_src_lib_config_.default_config.html) and active binds can be seen with `:viewconfig nmaps` or with [[bind]].

    Tridactyl also provides a few functions to manipulate text in the command line or text areas that can be found [here](/static/docs/modules/_src_lib_editor_.html). There are also a few commands only available in the command line which can be found [here](/static/docs/modules/_src_commandline_frame_.html).

    Ex-commands available exclusively in hint mode are listed [here](/static/docs/modules/_src_content_hinting_.html)

    We also have a [wiki](https://github.com/tridactyl/tridactyl/wiki) which may be edited by anyone.

    ## How to use this help page

    Every function (excmd) on this page can be called via Tridactyl's command line which we call "ex". There is a slight change in syntax, however. Wherever you see:

    `function(arg1,arg2)`

    You should instead type

    `function arg1 arg2` into the Tridactyl command line (accessed via `:`)

    A "splat" operator (...) means that the excmd will accept any number of space-delimited arguments into that parameter.

    Above each function signature you will see any aliases or key sequences bound to it. The internal names for the various modes are used, which are listed here:

        - `nmaps`: normal mode binds
        - `imaps`: insert mode binds
        - `inputmaps`: input mode binds
        - `ignoremaps`: ignore mode binds
        - `exaliases`: aliases in the command mode
        - `exmaps`: commandline mode binds

    At the bottom of each function's help page, you can click on a link that will take you straight to that function's definition in our code.

    You do not need to worry about types. Return values which are promises will turn into whatever they promise to when used in [[composite]].

    ## Caveats
    There are some caveats common to all webextension vimperator-alikes:

    - To make Tridactyl work on addons.mozilla.org and some other Mozilla domains, you need to open `about:config` and add a new boolean `privacy.resistFingerprinting.block_mozAddonManager` with the value `true`, as well as remove those domains from `extensions.webextensions.restrictedDomains`.
    - Tridactyl can't run on about:\*, some file:\* URIs, view-source:\*, or data:\*, URIs.
    - To change/hide the GUI of Firefox from Tridactyl, you can use [[guiset]] with the native messenger installed (see [[native]] and [[nativeinstall]]). Alternatively, you can edit your userChrome yourself.

    ## Getting help

    For more information, and FAQs, check out our [readme][2] and [troubleshooting guide][3] on github.

    Tridactyl is in a pretty early stage of development. Please report any issues and make requests for missing features on the GitHub [project page][1]. You can also get in touch using Matrix, Gitter, or IRC chat clients:

    [![Matrix Chat][matrix-badge]][matrix-link]
    [![Gitter Chat][gitter-badge]][gitter-link]
    [![Freenode Chat][freenode-badge]][freenode-link]

    All three channels are mirrored together, so it doesn't matter which one you use.

    [1]: https://github.com/tridactyl/tridactyl/issues
    [2]: https://github.com/tridactyl/tridactyl#readme
    [3]: https://github.com/tridactyl/tridactyl/blob/master/doc/troubleshooting.md

    [gitter-badge]: /static/badges/gitter-badge.svg
    [gitter-link]: https://gitter.im/tridactyl/Lobby
    [freenode-badge]: /static/badges/freenode-badge.svg
    [freenode-link]: ircs://chat.freenode.net/tridactyl
    [matrix-badge]: /static/badges/matrix-badge.svg
    [matrix-link]: https://matrix.to/#/#tridactyl:matrix.org
*/
/** ignore this line */

// {{{ setup

// Shared
import * as Messaging from "@src/lib/messaging"
import { ownWinTriIndex, getTriVersion, browserBg, activeTab, activeTabId, activeTabContainerId, openInNewTab, openInNewWindow, openInTab, queryAndURLwrangler } from "@src/lib/webext"
import * as Container from "@src/lib/containers"
import state from "@src/state"
import { contentState, ModeName } from "@src/content/state_content"
import * as UrlUtil from "@src/lib/url_util"
import * as config from "@src/lib/config"
import * as aliases from "@src/lib/aliases"
import * as Logging from "@src/lib/logging"
import { AutoContain } from "@src/lib/autocontainers"
import * as CSS from "css"
import * as Perf from "@src/perf"
import * as Metadata from "@src/.metadata.generated"
import { ObjectType } from "../compiler/types/ObjectType"
import * as Native from "@src/lib/native"
import * as TTS from "@src/lib/text_to_speech"
import * as excmd_parser from "@src/parsers/exmode"
import * as escape from "@src/lib/escape"
import semverCompare from "semver-compare"
import * as hint_util from "@src/lib/hint_util"
import { OpenMode } from "@src/lib/hint_util"

/**
 * This is used to drive some excmd handling in `composite`.
 *
 * @hidden
 */
let ALL_EXCMDS

// The entry-point script will make sure this has the right set of
// excmds, so we can use it without futher configuration.
import * as controller from "@src/lib/controller"

//#content_helper
import { generator as KEY_MUNCHER } from "@src/content/controller_content"

/**
 * Used to store the types of the parameters for each excmd for
 * self-documenting functionality.
 *
 * @hidden
 */
export const cmd_params = new Map<string, Map<string, string>>()

/** @hidden */
const logger = new Logging.Logger("excmd")

/** @hidden **/
const TRI_VERSION = getTriVersion()

//#content_helper
// {
import "@src/lib/number.clamp"
import * as CTSELF from "@src/.excmds_content.generated"
import { CmdlineCmds as CtCmdlineCmds } from "@src/background/commandline_cmds"
import { EditorCmds as CtEditorCmds } from "@src/background/editor"
import * as DOM from "@src/lib/dom"
import * as CommandLineContent from "@src/content/commandline_content"
import * as scrolling from "@src/content/scrolling"
import { ownTab } from "@src/lib/webext"
import { wrap_input, getLineAndColNumber, rot13_helper, jumble_helper } from "@src/lib/editor_utils"
import * as finding from "@src/content/finding"
import * as toys from "./content/toys"
import * as hinting from "@src/content/hinting"
import * as gobbleMode from "@src/parsers/gobblemode"
import * as nMode from "@src/parsers/nmode"

ALL_EXCMDS = {
    "": CTSELF,
    ex: CtCmdlineCmds,
    text: CtEditorCmds,
}
// }

import { mapstrToKeyseq, mozMapToMinimalKey, minimalKeyToMozMap } from "@src/lib/keyseq"

//#background_helper
// {

// tslint:disable-next-line:no-unused-declaration
import "@src/lib/number.mod"

import * as BGSELF from "@src/.excmds_background.generated"
import { CmdlineCmds as BgCmdlineCmds } from "@src/background/commandline_cmds"
import { EditorCmds as BgEditorCmds } from "@src/background/editor"
import { EditorCmds } from "@src/background/editor"
import { firefoxVersionAtLeast } from "@src/lib/webext"
import { parse_bind_args, modeMaps } from "@src/lib/binding"
import * as rc from "@src/background/config_rc"
import * as css_util from "@src/lib/css_util"
import * as Updates from "@src/lib/updates"
import * as Extensions from "@src/lib/extension_info"
import * as webrequests from "@src/background/webrequests"
import * as commandsHelper from "@src/background/commands"

ALL_EXCMDS = {
    "": BGSELF,
    ex: BgCmdlineCmds,
    text: BgEditorCmds,
}
/** @hidden */
// }

// }}}

// {{{ Native messenger stuff

/** @hidden **/
//#background
export async function getNativeVersion(): Promise<string> {
    return Native.getNativeMessengerVersion()
}

/** @hidden
 * This function is used by rssexec and rssexec completions.
 */
//#content
export async function getRssLinks(): Promise<Array<{ type: string; url: string; title: string }>> {
    const seen = new Set<string>()
    return Array.from(document.querySelectorAll<HTMLAnchorElement | HTMLLinkElement>("a, link[rel='alternate']"))
        .filter(e => typeof e.href === "string")
        .reduce((acc, e) => {
            let type = ""
            // Start by detecting type because url doesn't necessarily contain the words "rss" or "atom"
            if (e.type) {
                // if type doesn't match either rss or atom, don't include link
                if (e.type.indexOf("rss") < 0 && e.type.indexOf("atom") < 0) return acc
                type = e.type
            } else {
                // Making sure that we match either a dot or "xml" because "urss" and "atom" are actual words
                if (/(\.rss)|(rss\.xml)/i.test(e.href)) type = "application/rss+xml"
                else if (/(\.atom)|(atom\.xml)/i.test(e.href)) type = "application/atom+xml"
                else return acc
            }
            if (seen.has(e.href)) return acc
            seen.add(e.href)
            return acc.concat({ type, url: e.href, title: e.title || e.innerText } as { type: string; url: string; title: string })
        }, [])
}

/**
 * Execute [[rsscmd]] for an rss link.
 *
 * If `url` is undefined, Tridactyl will look for rss links in the current
 * page. If it doesn't find any, it will display an error message. If it finds
 * multiple urls, it will offer completions in order for you to select the link
 * you're interested in. If a single rss feed is found, it will automatically
 * be selected.
 */
//#content
export async function rssexec(url: string, type?: string, ...title: string[]) {
    if (!url || url === "") {
        const links = await getRssLinks()
        switch (links.length) {
            case 0:
                throw new Error("No rss link found on this page.")
                break
            case 1:
                url = links[0].url
                title = [links[0].title]
                type = links[0].type
                break
            default:
                return fillcmdline("rssexec")
        }
    }
    let rsscmd = config.get("rsscmd")
    if (rsscmd.match("%[uty]")) {
        rsscmd = rsscmd
            .replace("%u", url)
            .replace("%t", title.join(" "))
            .replace("%y", type || "")
    } else {
        rsscmd += " " + url
    }
    // Need actual excmd parsing here.
    return controller.acceptExCmd(rsscmd)
}

/**
 * Fills the element matched by `selector` with content and falls back to the last used input if the element can't be found. You probably don't want this; it's used internally for [[editor]].
 *
 * That said, `bind gs fillinput null [Tridactyl](https://addons.mozilla.org/en-US/firefox/addon/tridactyl-vim/) is my favourite add-on` could probably come in handy.
 */
//#content
export function fillinput(selector: string, ...content: string[]) {
    let inputToFill = document.querySelector(selector)
    if (!inputToFill) inputToFill = DOM.getLastUsedInput()
    if ("value" in inputToFill) {
        ;(inputToFill as HTMLInputElement).value = content.join(" ")
    } else {
        inputToFill.textContent = content.join(" ")
    }
}

/** @hidden */
//#content_helper
export function getInput(e: HTMLElement) {
    // this should probably be subsumed by the focusinput code
    if ("value" in e) {
        return (e as HTMLInputElement).value
    } else {
        return e.textContent
    }
}

/** @hidden */
//#content
export function getinput() {
    return getInput(DOM.getLastUsedInput())
}

/** @hidden */
//#content
export function getInputSelector() {
    return DOM.getSelector(DOM.getLastUsedInput())
}

/** @hidden */
//#content
export function addTridactylEditorClass(selector: string) {
    const elem = document.querySelector(selector)
    elem.className = elem.className + " TridactylEditing "
    return elem
}

/** @hidden */
//#content
export function removeTridactylEditorClass(selector: string) {
    const elem = document.querySelector(selector)
    elem.className = elem.className.replace(" TridactylEditing ", "")
}

/**
 * Opens your favourite editor (which is currently gVim) and fills the last used input with whatever you write into that file.
 * **Requires that the native messenger is installed, see [[native]] and [[nativeinstall]]**.
 *
 * Uses the `editorcmd` config option, default = `auto` looks through a list defined in lib/native.ts try find a sensible combination. If it's a bit slow, or chooses the wrong editor, or gives up completely, set editorcmd to something you want. The command must stay in the foreground until the editor exits.
 *
 * The editorcmd needs to accept a filename, stay in the foreground while it's edited, save the file and exit. By default the filename is added to the end of editorcmd, if you require control over the position of that argument, the first occurrence of %f in editorcmd is replaced with the filename. %l, if it exists, is replaced with the line number of the cursor and %c with the column number. For example:
 * ```
 * set editorcmd terminator -u -e "vim %f '+normal!%lGzv%c|'"
 * ```
 *
 * You're probably better off using the default insert mode bind of `<C-i>` (Ctrl-i) to access this.
 *
 * This function returns a tuple containing the path to the file that was opened by the editor and its content. This enables creating commands such as the following one, which deletes the temporary file created by the editor:
 * ```
 * alias editor_rm composite editor | jsb -p tri.native.run(`rm -f '${JS_ARG[0]}'`)
 * bind --mode=insert <C-i> editor_rm
 * bind --mode=input <C-i> editor_rm
 * ```
 */
//#content
export async function editor() {
    const elem = DOM.getLastUsedInput()
    const selector = DOM.getSelector(elem)
    addTridactylEditorClass(selector)

    if (!(await Native.nativegate())) {
        removeTridactylEditorClass(selector)
        return undefined
    }

    try {
        let text = ""
        let line = 0
        let col = 0
        wrap_input((t, start) => {
            ;[text, line, col] = getLineAndColNumber(t, start)
            return [null, null, null]
        })(elem)
        const file = (await Native.temp(text, document.location.hostname)).content
        const exec = await Native.editor(file, line, col)
        if (exec.code == 0) {
            fillinput(selector, exec.content)

            // TODO: add annoying "This message was written with [Tridactyl](https://addons.mozilla.org/en-US/firefox/addon/tridactyl-vim/)" to everything written using editor
            return [file, exec.content]
        } else {
            logger.debug(`Editor terminated with non-zero exit code: ${exec.code}`)
        }
    } catch (e) {
        throw new Error(`:editor failed: ${e}`)
    } finally {
        return removeTridactylEditorClass(selector)
    }
}

/**
 * Like [[guiset]] but quieter.
 */
//#background
export async function guiset_quiet(rule: string, option: string) {
    if (!rule || !option) throw new Error(":guiset requires two arguments. See `:help guiset` for more information.")
    if (rule == "navbar" && option == "none") throw new Error("`:guiset navbar none` is currently broken, see https://github.com/tridactyl/tridactyl/issues/1728")
    // Could potentially fall back to sending minimal example to clipboard if native not installed

    // Check for native messenger and make sure we have a plausible profile directory
    if (!(await Native.nativegate("0.1.1"))) return
    const profile_dir = await Native.getProfileDir()
    await setpref("toolkit.legacyUserProfileCustomizations.stylesheets", "true")

    // Make backups
    await Native.mkdir(profile_dir + "/chrome", true)
    const cssstr = (await Native.read(profile_dir + "/chrome/userChrome.css")).content
    const cssstrOrig = (await Native.read(profile_dir + "/chrome/userChrome.orig.css")).content
    if (cssstrOrig === "") await Native.write(profile_dir + "/chrome/userChrome.orig.css", cssstr)
    await Native.write(profile_dir + "/chrome/userChrome.css.tri.bak", cssstr)

    // Modify and write new CSS
    const stylesheet = CSS.parse(cssstr, { silent: true })
    if (stylesheet.stylesheet.parsingErrors.length) {
        const error = stylesheet.stylesheet.parsingErrors[0]
        throw new Error(`Your current userChrome.css is malformed: ${error.reason} at ${error.line}:${error.column}. Fix or delete it and try again.`)
    }
    // Trim due to https://github.com/reworkcss/css/issues/113
    const stylesheetDone = CSS.stringify(css_util.changeCss(rule, option, stylesheet)).trim()
    return Native.write(profile_dir + "/chrome/userChrome.css", stylesheetDone)
}

/**
 * Change which parts of the Firefox user interface are shown. **NB: This feature is experimental and might break stuff.**
 *
 * Might mangle your userChrome. Requires native messenger, and you must restart Firefox each time to see any changes (this can be done using [[restart]]). <!-- (unless you enable addon debugging and refresh using the browser toolbox) -->
 *
 * Also flips the preference `toolkit.legacyUserProfileCustomizations.stylesheets` to true so that FF will read your userChrome.
 *
 * View available rules and options [here](/static/docs/modules/_src_lib_css_util_.html#potentialrules) and [here](/static/docs/modules/_src_lib_css_util_.html#metarules).
 *
 * Example usage: `guiset gui none`, `guiset gui full`, `guiset tabs autohide`.
 *
 * Some of the available options:
 *
 * - gui
 *      - full
 *      - none
 *
 * - tabs
 *      - always
 *      - autohide
 *
 * - navbar
 *      - always
 *      - autohide
 *      - none
 *
 * - hoverlink (the little link that appears when you hover over a link)
 *      - none
 *      - left
 *      - right
 *      - top-left
 *      - top-right
 *
 * - statuspanel (hoverlink + the indicator that appears when a website is loading)
 *      - none
 *      - left
 *      - right
 *      - top-left
 *      - top-right
 *
 * If you want to use guiset in your tridactylrc, you might want to use [[guiset_quiet]] instead.
 */
//#background
export async function guiset(rule: string, option: string) {
    if (!(await guiset_quiet(rule, option))) {
        throw new Error(":guiset failed. Please ensure native messenger is installed.")
    }

    return fillcmdline_tmp(3000, "userChrome.css written. Please restart Firefox to see the changes.")
}

/** @hidden */
//#background
export function cssparse(...css: string[]) {
    console.log(CSS.parse(css.join(" ")))
}

/** @hidden */
//#background
export async function loadtheme(themename: string) {
    if (!(await Native.nativegate("0.1.9"))) return
    const separator = (await browserBg.runtime.getPlatformInfo()).os === "win" ? "\\" : "/"
    // remove the "tridactylrc" bit so that we're left with the directory
    const path = (await Native.getrcpath()).split(separator).slice(0, -1).join(separator) + separator + "themes" + separator + themename + ".css"
    const file = await Native.read(path)
    if (file.code !== 0) {
        if (Object.keys(await config.get("customthemes")).includes(themename)) return
        throw new Error("Couldn't read theme " + path)
    }
    return set("customthemes." + themename, file.content)
}

/** @hidden */
//#background
export async function unloadtheme(themename: string) {
    return unset("customthemes." + themename)
}

/**
 * Changes the current theme.
 *
 * If THEMENAME is any of the themes that can be found in the [Tridactyl repo](https://github.com/tridactyl/tridactyl/tree/master/src/static/themes) (e.g. 'dark'), the theme will be loaded from Tridactyl's internal storage.
 *
 * If THEMENAME is set to any other value except `--url`, Tridactyl will attempt to use its native binary (see [[native]]) in order to load a CSS file named THEMENAME from disk. The CSS file has to be in a directory named "themes" and this directory has to be in the same directory as your tridactylrc. If this fails, Tridactyl will attempt to load the theme from its internal storage.
 *
 * Lastly, themes can be loaded from URLs with `:colourscheme --url [url] [themename]`. They are stored internally - if you want to update the theme run the whole command again.
 *
 * Note that the theme name should NOT contain any dot.
 *
 * Example: `:colourscheme mysupertheme`
 * On linux, this will load ~/.config/tridactyl/themes/mysupertheme.css
 *
 * __NB__: due to Tridactyl's architecture, the theme will take a small amount of time to apply as each page is loaded. If this annoys you, you may use [userContent.css](http://kb.mozillazine.org/index.php?title=UserContent.css&printable=yes) to make changes to Tridactyl earlier. For example, users using the dark theme may like to put
 *
 * ```
 * :root {
 *     --tridactyl-bg: black !important;
 *     --tridactyl-fg: white !important;
 * }
 * ```
 *
 * in their `userContent.css`. Follow [issue #2510](https://github.com/tridactyl/tridactyl/issues/2510) if you would like to find out when we have made a more user-friendly solution.
 */
//#background
export async function colourscheme(...args: string[]) {
    const themename = args[0] == "--url" ? args[2] : args[0]

    // If this is a builtin theme, no need to bother with slow stuff
    if (Metadata.staticThemes.includes(themename)) return set("theme", themename)
    if (themename.search("\\.") >= 0) throw new Error(`Theme name should not contain any dots! (given name: ${themename}).`)
    if (args[0] == "--url") {
        if (themename === undefined) throw new Error(`You must provide a theme name!`)
        let url = args[1]
        if (url === "%") url = window.location.href // this is basically an easter egg
        if (!(url.startsWith("http://") || url.startsWith("https://"))) url = "http://" + url
        const css = await rc.fetchText(url)
        set("customthemes." + themename, css)
    } else {
        await loadtheme(themename)
    }
    return set("theme", themename)
}

/**
 * Write a setting to your user.js file. Requires a [[restart]] after running to take effect.
 *
 * @param key The key that should be set. Must not be quoted. Must not contain spaces.
 * @param value The value the key should take. Quoted if a string, unquoted otherwise.
 *
 * Note that not all of the keys Firefox uses are suggested by Tridactyl.
 *
 * e.g.: `setpref general.warnOnAboutConfig false`
 */
//#background
export function setpref(key: string, ...value: string[]) {
    return Native.writePref(key, value.join(" "))
}

/**
 * Remove a setting from your user.js file.
 *
 * @param key The key that should be set. Must not be quoted. Must not contain spaces.
 *
 */
//#background
export function removepref(key: string) {
    return Native.removePref(key)
}

/**
 * Like [[fixamo]] but quieter.
 *
 * Now purely a placebo as [[fixamo]] has been removed.
 */
//#background
export async function fixamo_quiet() {
    return logger.warning("fixamo_quiet has been removed at the behest of the Firefox Security team. See :help fixamo for more info.")
}

/**
 *
 * Used to simply set
 * ```js
 *  "privacy.resistFingerprinting.block_mozAddonManager":true
 *  "extensions.webextensions.restrictedDomains":""
 * ```
 * in about:config via user.js so that Tridactyl (and other extensions!) can be used on addons.mozilla.org and other sites.
 *
 * Removed at the request of the Firefox Security team. Replacements exist in our exemplar RC file.
 *
 * Requires `native` and a `restart`.
 */
//#background
export async function fixamo() {
    fillcmdline_tmp(10000, "fixamo has been removed at the request of the Firefox Security team. Alternatives exist in our exemplar RC file.")
}

/**
 * Uses the native messenger to open URLs.
 *
 * **Be *seriously* careful with this:**
 *
 * 1. the implementation basically execs `firefox --new-tab <your shell escaped string here>`
 * 2. you can use it to open any URL you can open in the Firefox address bar,
 *    including ones that might cause side effects (firefox does not guarantee
 *    that about: pages ignore query strings).
 *
 * You've been warned.
 *
 * This uses the [[browser]] setting to know which binary to call. If you need to pass additional arguments to firefox (e.g. '--new-window'), make sure they appear before the url.
 */
//#background
export async function nativeopen(...args: string[]) {
    const index = args.findIndex(arg => !arg.startsWith("-"))
    let firefoxArgs = []
    if (index >= 0) {
        firefoxArgs = args.slice(0, index)
    }
    const url = args.slice(firefoxArgs.length).join(" ")

    if (await Native.nativegate()) {
        // First compute where the tab should be
        const pos = await config.getAsync("tabopenpos")
        let index = (await activeTab()).index + 1
        switch (pos) {
            case "last":
                index = -1
                break
            case "related":
                // How do we simulate that?
                break
        }
        // Then make sure the tab is made active and moved to the right place
        // when it is opened in the current window
        const selecttab = tab => {
            browser.tabs.onCreated.removeListener(selecttab)
            tabSetActive(tab.id)
            browser.tabs.move(tab.id, { index })
        }
        browser.tabs.onCreated.addListener(selecttab)

        try {
            if ((await browser.runtime.getPlatformInfo()).os === "mac") {
                if ((await browser.windows.getCurrent()).incognito) {
                    throw new Error("nativeopen isn't supported in private mode on OSX. Consider installing Linux or Windows :).")
                }
                const osascriptArgs = ["-e 'on run argv'", "-e 'tell application \"Firefox\" to open location item 1 of argv'", "-e 'end run'"]
                await Native.run("osascript " + osascriptArgs.join(" ") + " " + url)
            } else {
                const os = (await browser.runtime.getPlatformInfo()).os
                if (firefoxArgs.length === 0) {
                    try {
                        const profile = await Native.getProfile()
                        if (profile.Name !== undefined) {
                            firefoxArgs = [`-p ${profile.Name}`]
                        } else if (profile.absolutePath !== undefined) {
                            if (os === "win") {
                                firefoxArgs = [`--profile "${profile.absolutePath}"`]
                            } else {
                                firefoxArgs = [`--profile '${profile.absolutePath}'`]
                            }
                        }
                    } catch (e) {
                        logger.debug(e)
                        firefoxArgs = []
                    }
                    firefoxArgs.push("--new-tab")
                }
                let escapedUrl: string
                // We need to quote and escape single quotes in the
                // url, otherwise an attacker could create an anchor with a url
                // like 'file:// && $(touch /tmp/dead)' and achieve remote code
                // execution when the user tries to follow it with `hint -W tabopen`
                if (os === "win") {
                    escapedUrl = escape.windows_cmd(url)
                } else {
                    escapedUrl = escape.sh(url)
                }
                await Native.run(`${config.get("browser")} ${firefoxArgs.join(" ")} ${escapedUrl}`)
            }
            setTimeout(() => browser.tabs.onCreated.removeListener(selecttab), 100)
        } catch (e) {
            browser.tabs.onCreated.removeListener(selecttab)
            throw e
        }
    }
}

/**
 * Run command in /bin/sh (unless you're on Windows), and print the output in the command line. Non-zero exit codes and stderr are ignored, currently.
 *
 * Requires the native messenger, obviously.
 *
 * If you want to use a different shell, just prepend your command with whatever the invocation is and keep in mind that most shells require quotes around the command to be executed, e.g. `:exclaim xonsh -c "1+2"`.
 *
 * Aliased to `!` but the exclamation mark **must be followed with a space**.
 */
//#background
export async function exclaim(...str: string[]) {
    let done = Promise.resolve()
    if (await Native.nativegate()) {
        done = fillcmdline((await Native.run(str.join(" "))).content)
    }
    return done
} // should consider how to give option to fillcmdline or not. We need flags.

/**
 * Like exclaim, but without any output to the command line.
 */
//#background
export async function exclaim_quiet(...str: string[]) {
    let result = ""
    if (await Native.nativegate()) {
        result = (await Native.run(str.join(" "))).content
    }
    return result
}

/**
 * Tells you if the native messenger is installed and its version.
 *
 */
//#background
export async function native() {
    const version = await Native.getNativeMessengerVersion(true)
    let done
    if (version !== undefined) {
        done = fillcmdline("# Native messenger is correctly installed, version " + version)
    } else {
        done = fillcmdline("# Native messenger not found. Please run `:nativeinstall` and follow the instructions.")
    }
    return done
}

/**
 * Copies the installation command for the native messenger to the clipboard and asks the user to run it in their shell.
 *
 * The native messenger's source code may be found here: https://github.com/tridactyl/native_messenger/blob/master/src/native_main.nim
 *
 * If your corporate IT policy disallows execution of binaries which have not been whitelisted but allows Python scripts, you may instead use the old native messenger by running `install.sh` or `win_install.ps1` from https://github.com/tridactyl/tridactyl/tree/master/native - the main downside is that it is significantly slower.
 */
//#background
export async function nativeinstall() {
    const tag = TRI_VERSION.includes("pre") ? "master" : TRI_VERSION
    let done
    const installstr = (await config.get("nativeinstallcmd")).replace("%TAG", tag)
    await yank(installstr)
    if ((await browser.runtime.getPlatformInfo()).os === "win") {
        done = fillcmdline("# Installation command copied to clipboard. Please paste and run it in cmd.exe (other shells won't work) to install the native messenger.")
    } else {
        done = fillcmdline("# Installation command copied to clipboard. Please paste and run it in your shell to install the native messenger.")
    }
    return done
}

/** Writes current config to a file.

    NB: an RC file is not required for your settings to persist: all settings are stored in a local Firefox storage database by default as soon as you set them.

    With no arguments supplied the excmd will try to find an appropriate
    config path and write the rc file to there. Any argument given to the
    excmd excluding the `-f` flag will be treated as a path to write the rc
    file to relative to the native messenger's location (`~/.local/share/tridactyl/`). By default, it silently refuses to overwrite existing files.

    The RC file will be split into sections that will be created if a config
    property is discovered within one of them:
    - General settings
    - Binds
    - Aliases
    - Autocmds
    - Autocontainers
    - Logging

    Note:
    - Subconfig paths fall back to using `js tri.config.set(key: obj)` notation.
    - This method is also used as a fallback mechanism for objects that didn't hit
      any of the heuristics.

    Available flags:
    - `-f` will overwrite the config file if it exists.
    - `--clipboard` write config to clipboard - no [[native]] required

    @param args an optional string of arguments to be parsed.
    @returns the parsed config.

*/
//#background
export async function mktridactylrc(...args: string[]) {
    let overwrite = false

    const argParse = (args: string[]): string[] => {
        if (args[0] === "-f") {
            overwrite = true
            args.shift()
            argParse(args)
        }
        return args
    }

    const file = argParse(args).join(" ") || undefined

    const conf = config.parseConfig()
    if (file == "--clipboard") {
        setclip(conf)
        return fillcmdline_tmp(3000, "# RC copied to clipboard")
    }
    if ((await Native.nativegate("0.1.11")) && !(await rc.writeRc(conf, overwrite, file))) logger.error("Could not write RC file")

    return conf
}

/**
 * Runs an RC file from disk or a URL
 *
 * This function accepts a flag: `--url` to load a RC from a URL.
 *
 * If no argument given, it will try to open ~/.tridactylrc, ~/.config/tridactyl/tridactylrc or $XDG_CONFIG_HOME/tridactyl/tridactylrc in reverse order. You may use a `_` in place of a leading `.` if you wish, e.g, if you use Windows.
 *
 * If no url is specified with the `--url` flag, the current page's URL is used to locate the RC file. Ensure the URL you pass (or page you are on) is a "raw" RC file, e.g. https://raw.githubusercontent.com/tridactyl/tridactyl/master/.tridactylrc and not https://github.com/tridactyl/tridactyl/blob/master/.tridactylrc.
 *
 * Tridactyl won't run on many raw pages due to a Firefox bug with Content Security Policy, so you may need to use the `source --url [URL]` form.
 *
 * On Windows, the `~` expands to `%USERPROFILE%`.
 *
 * The RC file is just a bunch of Tridactyl excmds (i.e, the stuff on this help page). Settings persist in local storage. There's an [example file](https://raw.githubusercontent.com/tridactyl/tridactyl/master/.tridactylrc) if you want it.
 *
 * There is a [bug](https://github.com/tridactyl/tridactyl/issues/1409) where not all lines of the RC file are executed if you use `sanitise` at the top of it. We instead recommend you put `:bind ZZ composite sanitise tridactyllocal; qall` in your RC file and use `ZZ` to exit Firefox.
 *
 * @param args the file/URL to open. For files: must be an absolute path, but can contain environment variables and things like ~.
 */
//#background
export async function source(...args: string[]) {
    if (args[0] === "--url") {
        let url = args[1]
        if (!url || url === "%") url = window.location.href
        if (!new RegExp("^(https?://)|data:").test(url)) url = "http://" + url
        await rc.sourceFromUrl(url)
    } else {
        const file = args.join(" ") || undefined
        if ((await Native.nativegate("0.1.3")) && !(await rc.source(file))) {
            logger.error("Could not find RC file")
        }
    }
}

/**
 * Same as [[source]] but suppresses all errors
 */
//#background
export async function source_quiet(...args: string[]) {
    try {
        await source(...args)
    } catch (e) {
        logger.info("Automatic loading of RC file failed.")
    }
}

/**
 * Updates the native messenger if it is installed, using our GitHub repo. This is run every time Tridactyl is updated.
 *
 * If you want to disable this, or point it to your own native messenger, edit the `nativeinstallcmd` setting.
 */
//#background
export async function updatenative(interactive = true) {
    if (!(await Native.nativegate("0", interactive))) {
        return
    } else if ((await browser.runtime.getPlatformInfo()).os === "mac") {
        if (interactive) logger.error("Updating the native messenger on OSX is broken. Please use `:nativeinstall` instead.")
        return
    }

    const tag = TRI_VERSION.includes("pre") ? "master" : TRI_VERSION
    const update_command = (await config.get("nativeinstallcmd")).replace("%TAG", tag)
    const native_version = await Native.getNativeMessengerVersion()

    if (semverCompare(native_version, "0.2.0") < 0) {
        await Native.run(update_command)
    } else if (semverCompare(native_version, "0.3.1") < 0) {
        if (interactive) {
            throw new Error("Updating is broken on this version of the native messenger. Please use `:nativeinstall` instead.")
        }
        return
    } else {
        await Native.runAsync(update_command)
    }

    if (interactive) native()
}

/**
 *  Restarts firefox with the same commandline arguments.
 *
 *  Warning: This can kill your tabs, especially if you :restart several times
 *  in a row
 */
//#background
export async function restart() {
    const profiledir = await Native.getProfileDir()
    const browsercmd = await config.get("browser")

    if ((await browser.runtime.getPlatformInfo()).os === "win") {
        const reply = await Native.winFirefoxRestart(profiledir, browsercmd)
        logger.info("[+] win_firefox_restart 'reply' = " + JSON.stringify(reply))
        if (Number(reply.code) === 0) {
            fillcmdline("#" + reply.content)
            qall()
        } else {
            fillcmdline("#" + reply.error)
        }
    } else {
        const firefox = (await Native.ff_cmdline()).join(" ")
        // Wait for the lock to disappear, then wait a bit more, then start firefox
        Native.run(`while readlink ${profiledir}/lock ; do sleep 1 ; done ; sleep 1 ; ${firefox}`)
        qall()
    }
}

/** Download the current document.
 *
 * If you have the native messenger v>=0.1.9 installed, the function accepts an optional argument, filename, which can be:
 * - An absolute path
 * - A path starting with ~, which will be expanded to your home directory
 * - A relative path, relative to the native messenger executable (e.g. ~/.local/share/tridactyl on linux).
 * If filename is not given, a download dialogue will be opened. If filename is a directory, the file will be saved inside of it, its name being inferred from the URL. If the directories mentioned in the path do not exist or if a file already exists at this path, the file will be kept in your downloads folder and an error message will be given.
 *
 * **NB**: if a non-default save location is chosen, Firefox's download manager will say the file is missing. It is not - it is where you asked it to be saved.
 *
 * Flags:
 * - `--overwrite`: overwrite the destination file.
 * - `--cleanup`: removes the downloaded source file e.g. `$HOME/Downlods/downloaded.doc` if moving it to the desired directory fails.
 */
//#content
export async function saveas(...args: string[]) {
    let overwrite = false
    let cleanup = false

    const argParse = (args: string[]): string[] => {
        if (args[0] === "--overwrite") {
            overwrite = true
            args.shift()
            argParse(args)
        }
        if (args[0] === "--cleanup") {
            cleanup = true
            args.shift()
            argParse(args)
        }
        return args
    }

    const file = argParse(args).join(" ") || undefined

    const requiredNativeMessengerVersion = "0.3.2"
    if ((overwrite || cleanup) && !(await Native.nativegate(requiredNativeMessengerVersion, false))) {
        throw new Error(`":saveas --{overwrite, cleanup}" requires native ${requiredNativeMessengerVersion} or later`)
    }

    if (args.length > 0) {
        const filename = await Messaging.message("download_background", "downloadUrlAs", window.location.href, file, overwrite, cleanup)
        return fillcmdline_tmp(10000, `Download completed: ${filename} stored in ${file}`)
    } else {
        return Messaging.message("download_background", "downloadUrl", window.location.href, true)
    }
}

// }}}

/** @hidden */
//#background_helper
function tabSetActive(id: number) {
    return browser.tabs.update(id, { active: true })
}

// }}}

// {{{ PAGE CONTEXT

/** @hidden */
//#content_helper
let JUMPED: boolean

/** @hidden */
//#content_helper
let JUMP_TIMEOUTID: number | undefined

/** This is used as an ID for the current page in the jumplist.
    It has a potentially confusing behavior: if you visit site A, then site B, then visit site A again, the jumplist that was created for your first visit on A will be re-used for your second visit.
    An ideal solution would be to have a counter that is incremented every time a new page is visited within the tab and use that as the return value for getJumpPageId but this doesn't seem to be trivial to implement.
    @hidden
 */
//#content_helper
export function getJumpPageId() {
    return document.location.href
}

/** @hidden */
//#content_helper
export async function saveJumps(jumps) {
    return browserBg.sessions.setTabValue(await activeTabId(), "jumps", jumps)
}

/** Returns a promise for an object containing the jumplist of all pages accessed in the current tab.
    The keys of the object currently are the page's URL, however this might change some day. Use [[getJumpPageId]] to access the jumplist of a specific page.
    @hidden
 */
//#content_helper
export async function curJumps() {
    const tabid = await activeTabId()
    let jumps = await browserBg.sessions.getTabValue(tabid, "jumps")
    if (!jumps) jumps = {}
    // This makes sure that `key` exists in `obj`, setting it to `def` if it doesn't
    const ensure = (obj, key, def) => {
        if (obj[key] === null || obj[key] === undefined) obj[key] = def
    }
    const page = getJumpPageId()
    ensure(jumps, page, {})
    ensure(jumps[page], "list", [{ x: window.scrollX, y: window.scrollY }])
    ensure(jumps[page], "cur", 0)
    saveJumps(jumps)
    return jumps
}

/** Calls [[jumpprev]](-n) */
//#content
export function jumpnext(n = 1) {
    return jumpprev(-n)
}

/** Similar to Pentadactyl or vim's jump list.
 *
 * When you scroll on a page, either by using the mouse or Tridactyl's key bindings, your position in the page will be saved after jumpdelay milliseconds (`:get jumpdelay` to know how many milliseconds that is). If you scroll again, you'll be able to go back to your previous position by using `:jumpprev 1`. If you need to go forward in the jumplist, use `:jumpprev -1`.
 *
 * Known bug: Tridactyl will use the same jumplist for multiple visits to a same website in the same tab, see [github issue 834](https://github.com/tridactyl/tridactyl/issues/834).
 */
//#content
export function jumpprev(n = 1) {
    return curJumps().then(alljumps => {
        const jumps = alljumps[getJumpPageId()]
        const current = jumps.cur - n
        if (current < 0) {
            jumps.cur = 0
            saveJumps(alljumps)
            return back(-current)
        } else if (current >= jumps.list.length) {
            jumps.cur = jumps.list.length - 1
            saveJumps(alljumps)
            return forward(current - jumps.list.length + 1)
        }
        jumps.cur = current
        const p = jumps.list[jumps.cur]
        saveJumps(alljumps)
        JUMPED = true
        window.scrollTo(p.x, p.y)
    })
}

/** Called on 'scroll' events.
    If you want to have a function that moves within the page but doesn't add a
    location to the jumplist, make sure to set JUMPED to true before moving
    around.
    The setTimeout call is required because sometimes a user wants to move
    somewhere by pressing 'j' multiple times and we don't want to add the
    in-between locations to the jump list
    @hidden
*/
//#content_helper
export function addJump() {
    if (JUMPED) {
        JUMPED = false
        return
    }
    const { scrollX, scrollY } = window
    // Prevent pending jump from being registered
    clearTimeout(JUMP_TIMEOUTID)
    // Schedule the registering of the current jump
    const localTimeoutID = window.setTimeout(async () => {
        // Get config for current page
        const alljumps = await curJumps()
        // if this handler was cancelled after the call to curJumps(), bail out
        if (localTimeoutID !== JUMP_TIMEOUTID) return

        const jumps = alljumps[getJumpPageId()]
        const list = jumps.list
        // if the page hasn't moved, stop
        if (list[jumps.cur].x === scrollX && list[jumps.cur].y === scrollY) return
        // Store the new jump
        // Could removing all jumps from list[cur] to list[list.length] be
        // a better/more intuitive behavior?
        list.push({ x: scrollX, y: scrollY })
        jumps.cur = jumps.list.length - 1
        saveJumps(alljumps)
    }, config.get("jumpdelay"))
    JUMP_TIMEOUTID = localTimeoutID
}

//#content_helper
document.addEventListener("scroll", addJump, { passive: true })

// Try to restore the previous jump position every time a page is loaded
//#content_helper
document.addEventListener("load", () => curJumps().then(() => jumpprev(0)))

/** Blur (unfocus) the active element */
//#content
export function unfocus() {
    ;((document.activeElement.shadowRoot ? DOM.deepestShadowRoot(document.activeElement.shadowRoot) : document).activeElement as HTMLInputElement).blur()
    contentState.mode = "normal"
}

/** Scrolls the window or any scrollable child element by a pixels on the horizontal axis and b pixels on the vertical axis.
 */
//#content
export async function scrollpx(a: number, b: number) {
    let done = Promise.resolve(undefined as any)
    if (!(await scrolling.scroll(a, b, document.documentElement))) {
        done = scrolling.recursiveScroll(a, b)
    }
    return done.then(() => undefined)
}

/** If two numbers are given, treat as x and y values to give to window.scrollTo
    If one number is given, scroll to that percentage along a chosen axis, defaulting to the y-axis. If the number has 'c' appended to it, it will be interpreted in radians.

    Note that if `a` is 0 or 100 and if the document is not scrollable in the given direction, Tridactyl will attempt to scroll the first scrollable element until it reaches the very bottom of that element.

    Examples:

    - `scrollto 50` -> scroll halfway down the page.
    - `scrollto 3.14c` -> scroll approximately 49.97465213% of the way down the page.
*/
//#content
export function scrollto(a: number | string, b: number | "x" | "y" = "y") {
    if (typeof a === "string" && /c$/i.exec(a)) {
        a = (Number(a.replace(/c$/, "")) * 100) / (2 * Math.PI)
    }
    a = Number(a)
    const elem = window.document.scrollingElement || window.document.documentElement
    const percentage = a.clamp(0, 100)
    let done = Promise.resolve(undefined as any)
    if (b === "y") {
        const top = elem.getClientRects()[0].top
        window.scrollTo(window.scrollX, (percentage * elem.scrollHeight) / 100)
        if (top === elem.getClientRects()[0].top && (percentage === 0 || percentage === 100)) {
            // scrollTo failed, if the user wants to go to the top/bottom of
            // the page try scrolling.recursiveScroll instead
            done = scrolling.recursiveScroll(window.scrollX, 1073741824 * (percentage === 0 ? -1 : 1), document.documentElement)
        }
    } else if (b === "x") {
        const left = elem.getClientRects()[0].left
        window.scrollTo((percentage * elem.scrollWidth) / 100, window.scrollY)
        if (left === elem.getClientRects()[0].left && (percentage === 0 || percentage === 100)) {
            done = scrolling.recursiveScroll(1073741824 * (percentage === 0 ? -1 : 1), window.scrollX, document.documentElement)
        }
    } else {
        window.scrollTo(a, Number(b)) // a,b numbers
    }
    return done.then(() => undefined)
}

/** @hidden */
//#content_helper
let lineHeight = null
/** Scrolls the document of its first scrollable child element by n lines.
 *
 *  The height of a line is defined by the site's CSS. If Tridactyl can't get it, it'll default to 22 pixels.
 */
//#content
export function scrollline(n = 1, mult = 1) {
    n = mult * n
    if (lineHeight === null) {
        const getLineHeight = elem => {
            // Get line height
            const cssHeight = window.getComputedStyle(elem).getPropertyValue("line-height")
            // Remove the "px" at the end
            return parseInt(cssHeight.substr(0, cssHeight.length - 2), 10)
        }
        lineHeight = getLineHeight(document.documentElement)
        if (!lineHeight) lineHeight = getLineHeight(document.body)
        // Is there a better way to compute a fallback? Maybe fetch from about:preferences?
        if (!lineHeight) lineHeight = 22
    }
    return scrolling.recursiveScroll(0, lineHeight * n)
}

/** Scrolls the document by n pages.
 * The height of a page is the current height of the window.
 *
 * @param count How many times to scroll. Used to facilitate key
 * binds with counts for `<C-F>` etc., not really useful otherwise.
 */
//#content
export function scrollpage(n = 1, count = 1) {
    return scrollpx(0, window.innerHeight * n * count)
}

/**
 *  Rudimentary find mode, left unbound by default as we don't currently support `incsearch`. Suggested binds:
 *
 *      bind / fillcmdline find
 *      bind ? fillcmdline find -?
 *      bind n findnext 1
 *      bind N findnext -1
 *      bind ,<Space> nohlsearch
 *
 *  Argument: A string you want to search for.
 *
 *  This function accepts two flags: `-?` to search from the bottom rather than the top and `-: n` to jump directly to the nth match.
 *
 *  The behavior of this function is affected by the following setting:
 *
 *  `findcase`: either "smart", "sensitive" or "insensitive". If "smart", find will be case-sensitive if the pattern contains uppercase letters.
 *
 *  Known bugs: find will currently happily jump to a non-visible element, and pressing n or N without having searched for anything will cause an error.
 */
//#content
export function find(...args: string[]) {
    const flagpos = args.indexOf("-?")
    const reverse = flagpos >= 0
    if (reverse) args.splice(flagpos, 1)

    const searchQuery = args.join(" ")
    return finding.jumpToMatch(searchQuery, reverse)
}

/** Jump to the next searched pattern.
 *
 * @param number - number of words to advance down the page (use 1 for next word, -1 for previous)
 *
 */
//#content
export function findnext(n = 1) {
    return finding.jumpToNextMatch(n)
}

//#content
export function clearsearchhighlight() {
    return finding.removeHighlighting()
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
    const tabstoreload = await getnexttabs(await activeTabId(), n)
    const reloadProperties = { bypassCache: hard }
    return Promise.all(tabstoreload.map(n => browser.tabs.reload(n, reloadProperties)))
}

/** Reloads all tabs, bypassing the cache if hard is set to true */
//#background
export async function reloadall(hard = false) {
    const tabs = await browser.tabs.query({ currentWindow: true })
    const reloadprops = { bypassCache: hard }
    return Promise.all(tabs.map(tab => browser.tabs.reload(tab.id, reloadprops)))
}

/** Reloads all tabs except the current one, bypassing the cache if hard is set to true
 *  You probably want to use [[reloaddead]] instead if you just want to be able to ensure Tridactyl is loaded in all tabs where it can be
 * */
//#background
export async function reloadallbut(hard = false) {
    let tabs = await browser.tabs.query({ currentWindow: true })
    const currId = await activeTabId()
    tabs = tabs.filter(tab => tab.id !== currId)
    const reloadprops = { bypassCache: hard }
    return Promise.all(tabs.map(tab => browser.tabs.reload(tab.id, reloadprops)))
}

//#background_helper
import { getTridactylTabs } from "@src/background/meta"
/** Reloads all tabs which Tridactyl isn't loaded in */
//#background
export async function reloaddead(hard = false) {
    const tabs = await browser.tabs.query({ currentWindow: true })
    const not_tridactyl_tabs = await getTridactylTabs(tabs, true)
    const reloadprops = { bypassCache: hard }
    return Promise.all(not_tridactyl_tabs.map(tab => browser.tabs.reload(tab.id, reloadprops)))
}

/** Reload the next n tabs, starting with activeTab. bypass cache for all */
//#background
export async function reloadhard(n = 1) {
    return reload(n, true)
}

// I went through the whole list https://developer.mozilla.org/en-US/Firefox/The_about_protocol
// about:blank is even more special
/** @hidden */
export const ABOUT_WHITELIST = ["about:license", "about:logo", "about:rights", "about:blank"]

/**
 * Open a new page in the current tab.
 *
 * @param urlarr
 *
 * - if first word looks like it has a schema, treat as a URI
 * - else if the first word contains a dot, treat as a domain name
 * - else if the first word is a key of [[SEARCH_URLS]], treat all following terms as search parameters for that provider
 * - else treat as search parameters for [[searchengine]]
 *
 * Related settings: [[searchengine]], [[historyresults]]
 *
 * Can only open about:* or file:* URLs if you have the native messenger installed, and on OSX you must set `browser` to something that will open Firefox from a terminal pass it commmand line options.
 *
 */
//#content
export async function open(...urlarr: string[]) {
    const url = urlarr.join(" ")

    // Setting window.location to about:blank results in a page we can't access, tabs.update works.
    if (!ABOUT_WHITELIST.includes(url) && /^(about|file):.*/.exec(url)) {
        // Open URLs that firefox won't let us by running `firefox <URL>` on the command line
        return nativeopen(url)
    } else if (/^javascript:/.exec(url)) {
        const bookmarklet = url.replace(/^javascript:/, "")
        document.body.append(
            html`
                <script>
                    ${bookmarklet}
                </script>
            `,
        )
    } else {
        const tab = await ownTab()
        return openInTab(tab, {}, urlarr)
    }
}

/**
 * Works exactly like [[open]], but only suggests bookmarks.
 *
 * If you want to use optional flags, you should run `:set completions.Bmark.autoselect false` to prevent the spacebar from inserting the URL of the top bookmark.
 *
 * @param opt Optional. Has to be `-t` in order to make bmarks open your bookmarks in a new tab.
 * @param urlarr any argument accepted by [[open]], or [[tabopen]] if opt is "-t" (e.g. `-c [container]` to open a bookmark in a container)
 */
//#background
export async function bmarks(opt: string, ...urlarr: string[]) {
    if (opt === "-t") return tabopen(...urlarr)
    else return open(opt, ...urlarr)
}

/**
 * Like [[open]] but doesn't make a new entry in history.
 */
//#content
export async function open_quiet(...urlarr: string[]) {
    const url = urlarr.join(" ")

    if (!ABOUT_WHITELIST.includes(url) && /^(about|file):.*/.exec(url)) {
        return nativeopen(url)
    }

    return ownTab().then(tab => openInTab(tab, { loadReplace: true }, urlarr))
}

/**
 *  If the url of the current document matches one of your search engines, will convert it to a list of arguments that open/tabopen will understand. If the url doesn't match any search engine, returns the url without modifications.
 *
 *  For example, if you have searchurls.gi set to "https://www.google.com/search?q=%s&tbm=isch", using this function on a page you opened using "gi butterflies" will return "gi butterflies".
 *
 *  This is useful when combined with fillcmdline, for example like this: `bind O composite url2args | fillcmdline open`.
 *
 *  Note that this might break with search engines that redirect you to other pages/add GET parameters that do not exist in your searchurl.
 */
//#content
export async function url2args() {
    const url = document.location.href
    const searchurls = await config.getAsync("searchurls")
    let result = url

    for (const engine of Object.keys(searchurls)) {
        const [beginning, end] = [...searchurls[engine].split("%s"), ""]
        if (url.startsWith(beginning) && url.endsWith(end)) {
            // Get the string matching %s
            let encodedArgs = url.substring(beginning.length)
            encodedArgs = encodedArgs.substring(0, encodedArgs.length - end.length)
            // Remove any get parameters that might have been added by the search engine
            // This works because if the user's query contains an "&", it will be encoded as %26
            const amperpos = encodedArgs.search("&")
            if (amperpos > 0) encodedArgs = encodedArgs.substring(0, amperpos)

            // Do transformations depending on the search engine
            if (beginning.search("duckduckgo") > 0) encodedArgs = encodedArgs.replace(/\+/g, " ")
            else if (beginning.search("wikipedia") > 0) encodedArgs = encodedArgs.replace(/_/g, " ")

            const args = engine + " " + decodeURIComponent(encodedArgs)
            if (args.length < result.length) result = args
        }
    }
    return result
}

/** @hidden */
//#content_helper
let sourceElement: Element
/** @hidden */
//#content_helper
function removeSource() {
    if (sourceElement) {
        sourceElement.remove()
        sourceElement = undefined
    }
}

/** Display the (HTML) source of the current page.

    Behaviour can be changed by the 'viewsource' setting.

    If the 'viewsource' setting is set to 'default' rather than 'tridactyl',
    the url the source of which should be displayed can be given as argument.
    Otherwise, the source of the current document will be displayed.
*/
//#content
export function viewsource(url = "") {
    if (url === "") url = window.location.href
    if (config.get("viewsource") === "default") {
        window.location.href = "view-source:" + url
        return
    }
    if (!sourceElement) {
        sourceElement = CommandLineContent.executeWithoutCommandLine(() => {
            const pre = document.createElement("pre")
            pre.id = "TridactylViewsourceElement"
            pre.className = "cleanslate " + config.get("theme")
            pre.innerText = document.documentElement.innerHTML
            document.documentElement.appendChild(pre)
            window.addEventListener("popstate", removeSource)
            return pre
        })
    } else {
        sourceElement.parentNode.removeChild(sourceElement)
        sourceElement = undefined
        window.removeEventListener("popstate", removeSource)
    }
}

/**
 * Go to the homepages you have set with `set homepages ["url1", "url2"]`.
 *
 *  @param all
 *  - if "true", opens all homepages in new tabs
 *  - if "false" or not given, opens the last homepage in the current tab
 *
 */
//#background
export function home(all: "false" | "true" = "false") {
    const homepages = config.get("homepages")
    let done = Promise.resolve(undefined as any)
    if (homepages.length > 0) {
        if (all === "false") {
            done = open(homepages[homepages.length - 1])
        } else {
            done = Promise.all(homepages.map(t => tabopen(t)))
        }
    }
    return done.then(() => undefined)
}

/** Show this page.

    `:help something` jumps to the entry for something. Something can be an excmd, an alias for an excmd, a binding or a setting.

    On the ex command page, the "nmaps" list is a list of all the bindings for the command you're seeing and the "exaliases" list lists all its aliases.

    If there's a conflict (e.g. you have a "go" binding that does something, a "go" excmd that does something else and a "go" setting that does a third thing), the binding is chosen first, then the setting, then the excmd. In such situations, if you want to let Tridactyl know you're looking for something specfic, you can specify the following flags as first arguments:

    `-a`: look for an alias
    `-b`: look for a binding
    `-e`: look for an ex command
    `-s`: look for a setting

    If the keyword you gave to `:help` is actually an alias for a composite command (see [[composite]]) , you will be taken to the help section for the first command of the pipeline. You will be able to see the whole pipeline by hovering your mouse over the alias in the "exaliases" list. Unfortunately there currently is no way to display these HTML tooltips from the keyboard.

    e.g. `:help bind`
*/
//#background
export async function help(...helpItems: string[]) {
    const flags = {
        // -a: look for an alias
        "-a": (settings, helpItem) => {
            const aliases = settings.exaliases
            // As long as helpItem is an alias, try to resolve this alias to a real helpItem
            const resolved = []
            while (aliases[helpItem]) {
                resolved.push(helpItem)
                helpItem = aliases[helpItem].split(" ")
                helpItem = helpItem[0] === "composite" ? helpItem[1] : helpItem[0]
                // Prevent infinite loops
                if (resolved.includes(helpItem)) break
            }
            if (resolved.length > 0) {
                return browser.runtime.getURL("static/docs/modules/_src_excmds_.html") + "#" + helpItem
            }
            return ""
        },
        // -b: look for a binding
        "-b": (settings, helpItem) => {
            for (const mode of modeMaps) {
                const bindings = settings[mode]
                // If 'helpItem' matches a binding, replace 'helpItem' with
                // the command that would be executed when pressing the key
                // sequence referenced by 'helpItem' and don't check other
                // modes
                if (helpItem in bindings) {
                    helpItem = bindings[helpItem].split(" ")
                    helpItem = ["composite", "fillcmdline"].includes(helpItem[0]) ? helpItem[1] : helpItem[0]
                    return browser.runtime.getURL("static/docs/modules/_src_excmds_.html") + "#" + helpItem
                }
            }
            return ""
        },
        // -e: look for an excmd
        "-e": (settings, helpItem) => browser.runtime.getURL("static/docs/modules/_src_excmds_.html") + "#" + helpItem,
        // -s: look for a setting
        "-s": (settings, helpItem) => {
            let subSettings = settings
            const settingNames = helpItem.split(".")
            let settingHelpAnchor = ""
            // Try to match each piece of the path, this is done so that a correct object (e.g. followpagepatterns) with an incorrect key (e.g. nextt) will still match the parent object.
            for (const settingName of settingNames) {
                if (settingName in subSettings) {
                    settingHelpAnchor += settingName + "."
                    subSettings = subSettings[settingName]
                }
            }
            if (settingHelpAnchor !== "") {
                return browser.runtime.getURL("static/docs/classes/_src_lib_config_.default_config.html") + "#" + settingHelpAnchor.slice(0, -1)
            }
            return ""
        },
    }

    let flag = ""

    if (helpItems.length > 0 && Object.keys(flags).includes(helpItems[0])) {
        flag = helpItems[0]
        helpItems.splice(0, 1)
    }

    const subject = helpItems.join(" ")
    const settings = await config.getAsync()
    let url = ""
    if (subject === "") {
        url = browser.runtime.getURL("static/docs/modules/_src_excmds_.html")
    } else {
        // If the user did specify what they wanted, specifically look for it
        if (flag !== "") {
            url = flags[flag](settings, subject)
        }

        // Otherwise or if it couldn't be found, try all possible items
        if (url === "") {
            url = ["-b", "-s", "-a", "-e"].reduce((acc, curFlag) => {
                if (acc !== "") return acc
                return flags[curFlag](settings, subject)
            }, "")
        }
    }

    let done
    if ((await activeTab()).url.startsWith(browser.runtime.getURL("static/docs/"))) {
        done = open(url)
    } else {
        done = tabopen(url)
    }
    return done.then(() => undefined)
}

/**
 * Search through the help pages. Accepts the same flags as [[help]]. Only useful in interactive usage with completions; the command itself is just a wrapper for [[help]].
 */
//#background
export async function apropos(...helpItems: string[]) {
    return help(...helpItems)
}

/** Start the tutorial
 * @param newtab - whether to start the tutorial in a newtab. Defaults to current tab.
 */
//#background
export async function tutor(newtab?: string) {
    const tutor = browser.runtime.getURL("static/clippy/1-tutor.html")
    let done: Promise<any>
    if (newtab) {
        done = tabopen(tutor)
    } else {
        done = open(tutor)
    }
    return done.then(() => undefined)
}

/**
 * Display Tridactyl's contributors in order of commits in a user-friendly fashion
 */
//#background
export async function credits() {
    const creditspage = browser.runtime.getURL("static/authors.html")
    return tabopen(creditspage)
}

/**
 * Cover the current page in an overlay to prevent clicking on links with the mouse to force yourself to use hint mode. Get rid of it by reloading the page.
 *
 * To bring back mouse control, use [[mouse_mode]] or refresh the page.
 *
 * Suggested usage: `autocmd DocLoad .* no_mouse_mode`
 *
 * "There is no mouse".
 */
//#content
export function no_mouse_mode() {
    toys.no_mouse()
}

/**
 * Matrix variant of [[no_mouse_mode]]
 *
 * "There is no mouse".
 *
 * Coincidentally added to Tridactyl at the same time as we reached 1337 stars on GitHub.
 */
//#content
export function neo_mouse_mode() {
    toys.jack_in()
}

/**
 * Christmas variant of [[no_mouse_mode]] (if you live in $DEFAULT hemisphere).
 */
//#content
export function snow_mouse_mode() {
    toys.snow()
}

/**
 * Music variant of [[no_mouse_mode]].
 */
//#content
export function pied_piper_mouse_mode() {
    toys.music()
}
/**
 * Drawable variant of [[no_mouse_mode]]
 * In this mode, you can use the mouse or a digital stylus to draw. To switch to an eraser, use [[drawingerasertoggle]]
 * Use [[mouse_mode]] to return, or refresh page.
 * Suggested usage: `autocmd DocLoad .* drawingstart
 *
 * **Warning**: Windows Ink enabled input devices don't work, disable it for your browser, or use a mouse.
 */
//#content
export function drawingstart() {
    toys.drawable()
}
/**
 * Switch between pen and eraser for [[drawingstart]]
 * Suggested usage: `bind e drawingerasertoggle`. If you have a digital pen, map the button to `e` to switch easily.
 */
//#content
export function drawingerasertoggle() {
    toys.eraser_toggle()
}
/**
 * Revert any variant of the [[no_mouse_mode]]
 *
 * Suggested usage: `bind <C-\> mouse_mode` with the autocmd mentioned in [[no_mouse_mode]] or [[drawingstart]].
 */
//#content
export function mouse_mode() {
    toys.removeBlock()
}

/** @hidden */
// Find clickable next-page/previous-page links whose text matches the supplied pattern,
// and return the last such link.
//
// If no matching link is found, return undefined.
//
// We return the last link that matches because next/prev buttons tend to be at the end of the page
// whereas lots of blogs have "VIEW MORE" etc. plastered all over their pages.
//#content_helper
function findRelLink(pattern: RegExp): HTMLAnchorElement | null {
    // querySelectorAll returns a "non-live NodeList" which is just a shit array without working reverse() or find() calls, so convert it.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const links = Array.from(document.querySelectorAll("a[href]") as NodeListOf<HTMLAnchorElement>)

    // Find the last link that matches the test
    return links.reverse().find(link => pattern.test(link.innerText))

    // Note:
    // `innerText` gives better (i.e. less surprising) results than `textContent`
    // at the expense of being much slower, but that shouldn't be an issue here
    // as it's a one-off operation that's only performed when we're leaving a page
}

/** @hidden */
// Return the last element in the document matching the supplied selector,
// or null if there are no matches.
function selectLast(selector: string): HTMLElement | null {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const nodes = document.querySelectorAll(selector) as NodeListOf<HTMLElement>
    return nodes.length ? nodes[nodes.length - 1] : null
}

/** Find a likely next/previous link and follow it

    If a link or anchor element with rel=rel exists, use that, otherwise fall back to:

        1) find the last anchor on the page with innerText matching the appropriate `followpagepattern`.
        2) call [[urlincrement]] with 1 or -1

    If you want to support e.g. French:

    ```
    set followpagepatterns.next ^(next|newer|prochain)\b|»|>>
    set followpagepatterns.prev ^(prev(ious)?|older|précédent)\b|«|<<
    ```

    @param rel   the relation of the target page to the current page: "next" or "prev"
*/
//#content
export function followpage(rel: "next" | "prev" = "next") {
    const link = selectLast(`link[rel~=${rel}][href]`) as HTMLLinkElement

    if (link) {
        window.location.href = link.href
        return
    }

    const anchor = (selectLast(`a[rel~=${rel}][href]`) || findRelLink(new RegExp(config.get("followpagepatterns", rel), "i"))) as HTMLAnchorElement

    if (anchor) {
        DOM.mouseEvent(anchor, "click")
    } else {
        urlincrement(rel === "next" ? 1 : -1)
    }
}

/** Increment the current tab URL
 *
 * @param count   the increment step, can be positive or negative
 *
 * @param multiplier    multiplies the count so that e.g. `5<C-x>` works.
 */
//#content
export function urlincrement(count = 1, multiplier = 1) {
    const newUrl = UrlUtil.incrementUrl(window.location.href, count * multiplier)

    if (newUrl !== null) {
        // This might throw an error when using incrementurl on a moz-extension:// page if the page we're trying to access doesn't exist
        try {
            window.location.href = newUrl
        } catch (e) {
            logger.info(`urlincrement: Impossible to navigate to ${newUrl}`)
        }
    }
}

/** Go to the root domain of the current URL
 */
//#content
export function urlroot() {
    const rootUrl = UrlUtil.getUrlRoot(window.location)

    if (rootUrl !== null) {
        window.location.href = rootUrl.href
    }
}

/** Go to the parent URL of the current tab's URL
 */
//#content
export function urlparent(count = 1) {
    const trailingSlash = config.get("urlparenttrailingslash") === "true"

    const parentUrl = UrlUtil.getUrlParent(window.location, trailingSlash, count)

    if (parentUrl !== null) {
        window.location.href = parentUrl.href
    }
}

/**
 * Open a URL made by modifying the current URL
 *
 * There are several modes:
 *
 * * Text replace mode:   `urlmodify -t <old> <new>`
 *
 *   Replaces the first instance of the text `old` with `new`.
 *      * `http://example.com` -> (`-t exa peta`) -> `http://petample.com`
 *
 * * Regex replacment mode: `urlmodify -r <regexp> <new> [flags]`
 *
 *   Replaces the first match of the `regexp` with `new`. You can use
 *   flags `i` and `g` to match case-insensitively and to match
 *   all instances respectively
 *      * `http://example.com` -> (`-r [ea] X g`) -> `http://XxXmplX.com`
 *
 * * Query set mode: `urlmodify -s <query> <value>`
 *
 *   Sets the value of a query to be a specific one. If the query already
 *   exists, it will be replaced.
 *      * `http://e.com?id=abc` -> (`-s foo bar`) -> `http://e.com?id=abc&foo=bar
 *
 * * Query replace mode: `urlmodify -q <query> <new_val>`
 *
 *   Replace the value of a query with a new one:
 *      * `http://e.com?id=foo` -> (`-q id bar`) -> `http://e.com?id=bar
 *
 * * Query delete mode: `urlmodify -Q <query>`
 *
 *   Deletes the given query (and the value if any):
 *      * `http://e.com?id=foo&page=1` -> (`-Q id`) -> `http://e.com?page=1`
 *
 * * Graft mode: `urlmodify -g <graft_point> <new_path_tail>`
 *
 *   "Grafts" a new tail on the URL path, possibly removing some of the old
 *   tail. Graft point indicates where the old URL is truncated before adding
 *   the new path.
 *
 *   * `graft_point` >= 0 counts path levels, starting from the left
 *   (beginning). 0 will append from the "root", and no existing path will
 *   remain, 1 will keep one path level, and so on.
 *   * `graft_point` < 0 counts from the right (i.e. the end of the current
 *   path). -1 will append to the existing path, -2 will remove the last path
 *   level, and so on.
 *
 *   ```plaintext
 *   http://website.com/this/is/the/path/component
 *   Graft point:       ^    ^  ^   ^    ^        ^
 *   From left:         0    1  2   3    4        5
 *   From right:       -6   -5 -4  -3   -2       -1
 *   ```
 *
 *   Examples:
 *
 *   * `http://e.com/issues/42` -> (`-g 0 foo`) -> `http://e.com/foo`
 *   * `http://e.com/issues/42` -> (`-g 1 foo`) -> `http://e.com/issues/foo`
 *   * `http://e.com/issues/42` -> (`-g -1 foo`) -> `http://e.com/issues/42/foo`
 *   * `http://e.com/issues/42` -> (`-g -2 foo`) -> `http://e.com/issues/foo`
 *
 *
 * * URL Input: `urlmodify -*u <arguments> <URL>`
 *
 *   Each mode can be augmented to accept a URL as the last argument instead of
 *   the current url.
 *
 *   Examples:
 *
 *   * `urlmodify -tu <old> <new> <URL>`
 *   * `urlmodify -su <query> <value> <URL>`
 *   * `urlmodify -gu <graft_point> <new_path_tail> <URL>`
 *
 * @param mode      The replace mode:
 *  * -t text replace
 *  * -r regexp replace
 *  * -s set the value of the given query
 *  * -q replace the value of the given query
 *  * -Q delete the given query
 *  * -g graft a new path onto URL or parent path of it
 *  * -*u Use last argument as URL input instead of current URL
 * @param replacement the replacement arguments (depends on mode):
 *  * -t <old> <new>
 *  * -r <regexp> <new> [flags]
 *  * -s <query> <value>
 *  * -q <query> <new_val>
 *  * -Q <query>
 *  * -g <graftPoint> <newPathTail>
 *  * -*u <arguments> <URL>
 */
//#content
export function urlmodify(mode: "-t" | "-r" | "-s" | "-q" | "-Q" | "-g" | "-tu" | "-ru" | "-su" | "-qu" | "-Qu" | "-gu", ...args: string[]) {
    const newUrl = urlmodify_js(mode, ...args)
    // TODO: once we have an arg parser, have a quiet flag that prevents the page from being added to history
    if (newUrl && newUrl !== window.location.href) {
        window.location.replace(newUrl)
    }
}

/**
 * Like [[urlmodify]] but returns the modified URL for use with [[js]] and [[composite]]
 *
 * E.g.
 *
 * `:composite urlmodify_js -t www. old. | tabopen `
 */
//#content
export function urlmodify_js(mode: "-t" | "-r" | "-s" | "-q" | "-Q" | "-g" | "-tu" | "-ru" | "-su" | "-qu" | "-Qu" | "-gu", ...args: string[]) {
    let oldUrl
    let newmode
    if (mode.slice(-1) == "u"){
        oldUrl = new URL (args.pop())
        newmode = mode.slice(0, -1)
    }else{
        oldUrl = new URL(window.location.href)
        newmode = mode
    }
    let newUrl

    switch (newmode) {
        case "-t":
            if (args.length !== 2) {
                throw new Error("Text replacement needs 2 arguments:" + "<old> <new>")
            }

            newUrl = oldUrl.href.replace(args[0], args[1])
            break

        case "-r":
            if (args.length < 2 || args.length > 3) {
                throw new Error("RegExp replacement takes 2 or 3 arguments: " + "<regexp> <new> [flags]")
            }

            if (args[2] && args[2].search(/^[gi]+$/) === -1) {
                throw new Error("RegExp replacement flags can only include 'g', 'i'" + ", Got '" + args[2] + "'")
            }

            const regexp = new RegExp(args[0], args[2])
            newUrl = oldUrl.href.replace(regexp, args[1])
            break

        case "-s":
            if (args.length !== 2) {
                throw new Error("Query setting needs 2 arguments:" + "<query> <value>")
            }

            newUrl = UrlUtil.setQueryValue(oldUrl, args[0], args[1])
            break
        case "-q":
            if (args.length !== 2) {
                throw new Error("Query replacement needs 2 arguments:" + "<query> <new_val>")
            }

            newUrl = UrlUtil.replaceQueryValue(oldUrl, args[0], args[1])
            break
        case "-Q":
            if (args.length !== 1) {
                throw new Error("Query deletion needs 1 argument:" + "<query>")
            }

            newUrl = UrlUtil.deleteQuery(oldUrl, args[0])
            break

        case "-g":
            if (args.length !== 2) {
                throw new Error("URL path grafting needs 2 arguments:" + "<graft point> <new path tail>")
            }

            newUrl = UrlUtil.graftUrlPath(oldUrl, args[1], Number(args[0]))
            break
    }

    return newUrl
}

/** Returns the url of links that have a matching rel.

    Don't bind to this: it's an internal function.

    @hidden
 */
//#content
export async function geturlsforlinks(reltype = "rel", rel: string) {
    const elems = document.querySelectorAll("link[" + reltype + "='" + rel + "']")
    if (elems) return Array.prototype.map.call(elems, x => x.href)
    return []
}

/** Sets the current page's zoom level anywhere between 30% and 300%.
 *
 * If you overshoot the level while using relative adjustments i.e. level > 300% or level < 30% the zoom level will be set to it's maximum or minimum position. Relative adjustments are made * in percentage points, i.e. `:zoom +10 true` increases the zoom level from 50% to 60% or from * 200% to 210%.
 *
 * @param level - The zoom level to set. Treated as percentage value if larger than 3 or smaller than -3.
 * @param rel - Set the zoom adjustment to be relative to current zoom level.
 * @param tabId - The tabId to apply zoom level too.
 * If set to 'auto' it will default to the current active tab.
 * This uses mozilla's internal tabId and not tridactyl's tabId.
 */
//#background
export async function zoom(level = 0, rel = "false", tabId = "auto") {
    level = Math.abs(level) > 3 ? level / 100 : level
    if (rel === "false" && (level > 3 || level < 0.3)) {
        throw new Error(`[zoom] level out of range: ${level}`)
    }
    if (rel === "true") {
        level += await browser.tabs.getZoom()

        // Handle overshooting of zoom level.
        if (level > 3) level = 3
        if (level < 0.3) level = 0.3
    }

    if (tabId === "auto") {
        return browser.tabs.setZoom(level)
    } else {
        return browser.tabs.setZoom(parseInt(tabId, 10), level)
    }
}

/** Opens the current page in Firefox's reader mode.
 * You currently cannot use Tridactyl while in reader mode.
 */
//#background
export async function reader() {
    if (await firefoxVersionAtLeast(58)) {
        const aTab = await activeTab()
        if (aTab.isArticle) {
            return browser.tabs.toggleReaderMode()
        } // else {
        //  // once a statusbar exists an error can be displayed there
        // }
    }
}

/** @hidden **/
//#content_helper
// {
loadaucmds("DocStart")
const autocmd_logger = new Logging.Logger("autocmds")
window.addEventListener("pagehide", () => loadaucmds("DocEnd"))
window.addEventListener("DOMContentLoaded", () => loadaucmds("DocLoad"))

// Unsupported edge-case: a SPA that doesn't have a UriChange autocmd changes URL to one that does.
config.getAsync("autocmds", "UriChange").then(ausites => {
    if (!ausites) return
    const aukeyarr = Object.keys(ausites).filter(e => window.document.location.href.search(e) >= 0)
    if (aukeyarr.length > 0) {
        let currUri = window.document.location.href
        function maybeLoad() {
            const nowUri = window.document.location.href
            if (nowUri != currUri) {
                currUri = nowUri
                loadaucmds("UriChange")
            }
        }
        setInterval(maybeLoad, 100)
    }
})
/** @hidden */
const fullscreenhandler = () => {
    loadaucmds("FullscreenChange")
    if (document.fullscreenElement || (document as any).mozFullScreenElement) {
        loadaucmds("FullscreenEnter")
    } else {
        loadaucmds("FullscreenLeft")
    }
}

/** @hidden **/
const fullscreenApiIsPrefixed = "mozFullScreenEnabled" in document

// Until firefox removes vendor prefix for this api (in FF64), we must also use mozfullscreenchange
if (fullscreenApiIsPrefixed) {
    document.addEventListener("mozfullscreenchange", fullscreenhandler)
} else if ("fullscreenEnabled" in document) {
    document.addEventListener("fullscreenchange", fullscreenhandler)
}
// }

/** @hidden */
//#content
export async function loadaucmds(cmdType: "DocStart" | "DocLoad" | "DocEnd" | "TabEnter" | "TabLeft" | "FullscreenEnter" | "FullscreenLeft" | "FullscreenChange" | "UriChange") {
    const aucmds = await config.getAsync("autocmds", cmdType)
    const ausites = Object.keys(aucmds)
    const aukeyarr = ausites.filter(e => window.document.location.href.search(e) >= 0)
    const owntab = await ownTab()
    const replacements = {
        TRI_FIRED_MOZ_TABID: owntab.id,
        TRI_FIRED_TRI_TABINDEX: owntab.index + 1,
        TRI_FIRED_MOZ_WINID: owntab.windowId,
        TRI_FIRED_TRI_WININDEX: await ownWinTriIndex(),
        TRI_FIRED_MOZ_OPENERTABID: owntab.openerTabId,
        TRI_FIRED_ACTIVE: owntab.active,
        TRI_FIRED_AUDIBLE: owntab.audible,
        TRI_FIRED_MUTED: owntab.mutedInfo.muted,
        TRI_FIRED_DISCARDED: owntab.discarded,
        TRI_FIRED_HEIGHT: owntab.height,
        TRI_FIRED_WIDTH: owntab.width,
        TRI_FIRED_HIDDEN: owntab.hidden,
        TRI_FIRED_INCOGNITO: owntab.incognito,
        TRI_FIRED_ISARTICLE: owntab.isArticle,
        TRI_FIRED_LASTACCESSED: owntab.lastAccessed,
        TRI_FIRED_PINNED: owntab.pinned,
        TRI_FIRED_TITLE: owntab.title,
        TRI_FIRED_URL: owntab.url,
    }
    for (const aukey of aukeyarr) {
        for (const [k, v] of Object.entries(replacements)) {
            aucmds[aukey] = aucmds[aukey].replace(k, v)
        }
        try {
            autocmd_logger.debug(`${cmdType} matched ${aukey}: ${aucmds[aukey]}`)
            await controller.acceptExCmd(aucmds[aukey])
        } catch (e) {
            autocmd_logger.error((e as Error).toString())
        }
    }
}

/** The kinds of input elements that we want to be included in the "focusinput"
 * command (gi)
 * @hidden
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
[role='application'],
[contenteditable='true'][role='textbox']
`

/** Password field selectors
 * @hidden
 */
const INPUTPASSWORD_selectors = `
input[type='password']
`

/** Focus the last used input on the page
 *
 * @param nth   focus the nth input on the page, or "special" inputs:
 *                  "-l": last focussed input
 *                  "-n": input after last focussed one
 *                  "-N": input before last focussed one
 *                  "-p": first password field
 *                  "-b": biggest input field
 */
//#content
export function focusinput(nth: number | string) {
    let inputToFocus: HTMLElement = null

    // set to false to avoid falling back on the first available input
    // if a special finder fails
    let fallbackToNumeric = true

    // nth = "-l" -> use the last used input for this page
    if (nth === "-l") {
        // try to recover the last used input stored as a
        // DOM node, which should be exactly the one used before (or null)
        if (DOM.getLastUsedInput()) {
            inputToFocus = DOM.getLastUsedInput()
        } else {
            // Pick the first input in the DOM.
            inputToFocus = DOM.getElemsBySelector(INPUTTAGS_selectors, [DOM.isSubstantial])[0] as HTMLElement

            // We could try to save the last used element on page exit, but
            // that seems like a lot of faff for little gain.
        }
    } else if (nth === "-n" || nth === "-N") {
        // attempt to find next/previous input
        const inputs = DOM.getElemsBySelector(INPUTTAGS_selectors, [DOM.isSubstantial]) as HTMLElement[]
        if (inputs.length) {
            let index = inputs.indexOf(DOM.getLastUsedInput())
            if (DOM.getLastUsedInput()) {
                if (nth === "-n") {
                    index++
                } else {
                    index--
                }
                index = index.mod(inputs.length)
            } else {
                index = 0
            }
            inputToFocus = inputs[index]
        }
    } else if (nth === "-p") {
        // attempt to find a password input
        fallbackToNumeric = false

        const inputs = DOM.getElemsBySelector(INPUTPASSWORD_selectors, [DOM.isSubstantial])

        if (inputs.length) {
            inputToFocus = inputs[0] as HTMLElement
        }
    } else if (nth === "-b") {
        const inputs = DOM.getElemsBySelector(INPUTTAGS_selectors, [DOM.isSubstantial]) as HTMLElement[]
        inputs.sort(DOM.compareElementArea)
        inputToFocus = inputs[inputs.length - 1]
    }

    // either a number (not special) or we failed to find a special input when
    // asked and falling back is acceptable
    if ((!inputToFocus || !document.contains(inputToFocus)) && fallbackToNumeric) {
        const index = isNaN(nth as number) ? 0 : (nth as number)
        inputToFocus = DOM.getNthElement(INPUTTAGS_selectors, index, [DOM.isSubstantial])
    }

    if (inputToFocus) {
        DOM.focus(inputToFocus)
        if (config.get("gimode") === "nextinput" && contentState.mode !== "input") {
            contentState.mode = "input"
        }
    }
}

/**
 * Focus the tab which contains the last focussed input element. If you're lucky, it will focus the right input, too.
 *
 * Currently just goes to the last focussed input; being able to jump forwards and backwards is planned.
 */
//#background
export async function changelistjump() {
    const tail = state.prevInputs[state.prevInputs.length - 1]
    const jumppos = tail.jumppos ? tail.jumppos : state.prevInputs.length - 1
    const input = state.prevInputs[jumppos]
    await browser.tabs.update(input.tab, { active: true })
    const id = input.inputId
    // Not all elements have an ID, so this will do for now.
    if (id) focusbyid(input.inputId)
    else focusinput("-l")

    // Really want to bin the input we just focussed ^ and edit the real last input to tell us where to jump to next.
    // It doesn't work in practice as the focus events get added after we try to delete them.
    // Even editing focusbyid/focusinput doesn't work to try to delete their own history doesn't work.
    // I'm bored of working on it for now, though.
    // Probable solution: add an event listener to state.prevInputs changing, delete the focussed element, then delete event listener.
    //
    // let arr = state.prevInputs
    // arr.splice(-2,2)

    // tail.jumppos = jumppos - 1
    // arr = arr.concat(tail)
    // state.prevInputs = arr
}

/** @hidden */
//#content
export function focusbyid(id: string) {
    document.getElementById(id).focus()
}

// }}}

// {{{ TABS

/** Switch to the tab by index (position on tab bar), wrapping round.

    @param index
        1-based index of the tab to target. Wraps such that 0 = last tab, -1 =
        penultimate tab, etc.

        if undefined, return activeTabId()
*/
/** @hidden */
//#background_helper
async function tabIndexSetActive(index: number | string) {
    return tabSetActive(await idFromIndex(index))
}

/** Switch to the next tab, wrapping round.

    If increment is specified, move that many tabs forwards.
 */
//#background
export async function tabnext(increment = 1) {
    return tabprev(-increment)
}

/** Switch to the next tab, wrapping round.

    If an index is specified, go to the tab with that number (this mimics the
    behaviour of `{count}gt` in vim, except that this command will accept a
    count that is out of bounds (and will mod it so that it is within bounds as
    per [[tabmove]], etc)).
 */
//#background
export async function tabnext_gt(index?: number) {
    let done: Promise<any>
    if (index === undefined) {
        done = tabnext()
    } else {
        done = tabIndexSetActive(index)
    }
    return done.then(() => undefined)
}

/** Switch to the previous tab, wrapping round.

    If increment is specified, move that many tabs backwards.
 */
//#background
export async function tabprev(increment = 1) {
    return browser.tabs.query({ currentWindow: true, hidden: false }).then(tabs => {
        tabs.sort((t1, t2) => t1.index - t2.index)
        const prevTab = (tabs.findIndex(t => t.active) - increment + tabs.length) % tabs.length
        return browser.tabs.update(tabs[prevTab].id, { active: true })
    })
}

/**
 * Pushes the current tab to another window. Only works for windows of the same type
 * (can't push a non-private tab to a private window or a private tab to
 * a non-private window).
 * If *windowId* is not specified, pushes to the next newest window,
 * wrapping around.
 */
//#background
export async function tabpush(windowId?: number) {
    const currentWindow = await browser.windows.getCurrent()
    const windows = (await browser.windows.getAll()).filter(w => w.incognito === currentWindow.incognito)
    windows.sort((w1, w2) => w1.id - w2.id)
    const nextWindow = windows[(windows.findIndex(window => window.id === currentWindow.id) + 1) % windows.length]
    const tabId = await activeTabId()
    return browser.tabs.move(tabId, { index: -1, windowId: windowId ?? nextWindow.id })
}

/** Switch to the tab currently playing audio, if any. */
//#background
export async function tabaudio() {
    const tabs = await browser.tabs.query({ audible: true })
    if (tabs.length > 0) {
        await browser.windows.update(tabs[0].windowId, { focused: true })
        return browser.tabs.update(tabs[0].id, { active: true })
    }
}

/**
 * Moves all of the targetted window's tabs to the current window. Only works for windows of the same type
 * (can't merge a non-private tab with a private window).
 */
//#background
export async function winmerge(...windowIds: string[]) {
    const target_wins = windowIds.length > 0 ? await Promise.all(windowIds.map(windowId => browser.windows.get(parseInt(windowId, 10), { populate: true }))) : await browser.windows.getAll({ populate: true })
    const active_win = await browser.windows.getCurrent()
    return target_wins.forEach(target_win =>
        browser.tabs.move(
            target_win.tabs.map(t => t.id),
            { index: -1, windowId: active_win.id },
        ),
    )
}

/**
 * Given a string of the format windowIndex.tabIndex, returns a tuple of
 * numbers corresponding to the window index and tab index or the current
 * window and tab if the string doesn't have the right format.
 */
//#background_helper
async function parseWinTabIndex(id: string) {
    const windows = (await browser.windows.getAll()).map(w => w.id).sort((a, b) => a - b)
    if (id === null || id === undefined || !/\d+\.\d+/.exec(id)) {
        const tab = await activeTab()
        const prevId = id
        id = windows.indexOf(tab.windowId) + "." + (tab.index + 1)
        logger.info(`taball: Bad tab id: ${prevId}, defaulting to ${id}`)
    }
    const [winindex, tabindex_string] = id.split(".")
    return [windows[parseInt(winindex, 10) - 1], parseInt(tabindex_string, 10) - 1]
}

/**
 * Moves a tab identified by a windowIndex.tabIndex id to the current window.
 * Only works for windows of the same type (can't grab a non-private tab from a
 * private window and can't grab a private tab from a non-private window).
 */
//#background
export async function tabgrab(id: string) {
    // Figure out what tab should be grabbed
    const [winid, tabindex_number] = await parseWinTabIndex(id)
    const tabid = (await browser.tabs.query({ windowId: winid, index: tabindex_number }))[0].id
    // Figure out where it should be put
    const windowId = (await browser.windows.getLastFocused({ windowTypes: ["normal"] })).id
    // Move window
    return browser.tabs.move(tabid, { index: -1, windowId })
}

/** Like [[open]], but in a new tab. If no address is given, it will open the newtab page, which can be set with `set newtab [url]`

    Use the `-c` flag followed by a container name to open a tab in said container. Tridactyl will try to fuzzy match a name if an exact match is not found (opening the tab in no container can be enforced with "firefox-default" or "none"). If any autocontainer directives are configured and -c is not set, Tridactyl will try to use the right container automatically using your configurations.

    Use the `-b` flag to open the tab in the background.

    Use the `-w` flag to wait for the web page to load before "returning". This only makes sense for use with [[composite]], which waits for each command to return before moving on to the next one, e.g. `composite tabopen -b -w news.bbc.co.uk ; tabnext`.

    These three can be combined in any order, but need to be placed as the first arguments.

    Unlike Firefox's Ctrl-t shortcut, this opens tabs immediately after the
    currently active tab rather than at the end of the tab list because that is
    the authors' preference.

    If you would rather the Firefox behaviour `set tabopenpos last`. This
    preference also affects the clipboard, quickmarks, home, help, etc.

    If you would rather the URL be opened as if you'd middle clicked it, `set
    tabopenpos related`.

    Hinting is controlled by `relatedopenpos`

    Also see the [[searchengine]] and [[searchurls]] settings.
*/
//#background
export async function tabopen(...addressarr: string[]): Promise<browser.tabs.Tab> {
    let active
    let waitForDom
    let container

    const win = await browser.windows.getCurrent()

    // Lets us pass both -b and -c in no particular order as long as they are up front.
    async function argParse(args: string[]): Promise<string[]> {
        if (args[0] === "-b") {
            active = false
            args.shift()
            argParse(args)
        } else if (args[0] === "-w") {
            waitForDom = true
            args.shift()
            argParse(args)
        } else if (args[0] === "-c") {
            if (args.length < 2) throw new Error(`You must provide a container name!`)
            // Ignore the -c flag if incognito as containers are disabled.
            if (!win.incognito) {
                if (args[1] === "firefox-default" || args[1].toLowerCase() === "none") {
                    container = "firefox-default"
                } else {
                    container = await Container.fuzzyMatch(args[1])
                }
            } else logger.error("[tabopen] can't open a container in a private browsing window.")

            args.shift()
            args.shift()
            argParse(args)
        }
        return args
    }

    const query = await argParse(addressarr)

    const address = query.join(" ")
    if (!ABOUT_WHITELIST.includes(address) && /^(about|file):.*/.exec(address)) {
        return nativeopen(address) as unknown as browser.tabs.Tab // I don't understand why changing the final return below meant I had to change this
    }

    const aucon = new AutoContain()
    if (!container && aucon.autocontainConfigured()) {
        const autoContainer = await aucon.getAuconForUrl(address)
        if (autoContainer && autoContainer !== "firefox-default") {
            container = autoContainer
            logger.debug("tabopen setting container automatically using autocontain directive")
        }
    }

    const containerId = await activeTabContainerId()
    const args = { active } as any
    // Ensure -c has priority.
    if (container) {
        if (container !== "firefox-default") {
            args.cookieStoreId = container
        }
    } else if (containerId && config.get("tabopencontaineraware") === "true") {
        args.cookieStoreId = containerId
    }
    const maybeURL = await queryAndURLwrangler(query)
    if (typeof maybeURL === "string") {
        return openInNewTab(maybeURL, args, waitForDom)
    }

    if (typeof maybeURL === "object") {
        if (await firefoxVersionAtLeast(80)) {
            // work around #2695 until we can work out what is going on
            if (args.active === false || args.cookieStoreId !== undefined || waitForDom === true) {
                throw new Error("Firefox search engines do not support containers or background tabs in FF >80. `:set searchengine google` or see issue https://github.com/tridactyl/tridactyl/issues/2695")
            }

            // This ignores :set tabopenpos / issue #342. TODO: fix that somehow.
            return browser.search.search(maybeURL)
        }
        return openInNewTab(null, args, waitForDom).then(tab => browser.search.search({ tabId: tab.id, ...maybeURL }))
    }

    // Fall back to about:newtab
    return openInNewTab(null, args, waitForDom)
}

/**
  Passes its first argument to `tabopen -b`. Once the tab opened by `tabopen
  -b` is activated/selected/focused, opens its second argument with `tabopen
  -b`. Once the second tab is activated/selected/focused, opens its third
  argument with `tabopen -b` and so on and so forth until all arguments have
  been opened in a new tab or until a tab is closed without being
  activated/selected/focused.

  Example usage:
    `tabqueue http://example.org http://example.com http://example.net`
    `composite hint -qpipe a href | tabqueue`
*/
//#background
export function tabqueue(...addresses: string[]) {
    // addresses[0] is a string when called with `tabopen a b c` but an array
    // when called from `composite hint -qpipe a href | tabqueue`.
    addresses = addresses.flat(Infinity)
    if (addresses.length === 0) {
        return Promise.resolve()
    }
    return tabopen("-b", addresses[0]).then(
        tab =>
            new Promise(resolve => {
                function openNextTab(activeInfo) {
                    if (activeInfo.tabId === tab.id) {
                        resolve(tabqueue(...addresses.slice(1)))
                        removeTabqueueListeners(tab.id)
                    }
                }
                function removeTabqueueListeners(tabId) {
                    if (tabId === tab.id) {
                        browser.tabs.onActivated.removeListener(openNextTab)
                        browser.tabs.onRemoved.removeListener(removeTabqueueListeners)
                        // FIXME: This should actually be `reject(tab)` to
                        // interrupt pipelines, but this results in an impossible
                        // to debug `Error: undefined` message being printed on the
                        // command line. So we silently resolve the promise and
                        // hope for the best.
                        resolve(tab)
                    }
                }
                browser.tabs.onActivated.addListener(openNextTab)
                browser.tabs.onRemoved.addListener(removeTabqueueListeners)
            }),
    )
}

/** Resolve a tab index to the tab id of the corresponding tab in this window.

    @param index
        1-based index of the tab to target. Wraps such that 0 = last tab, -1 =
        penultimate tab, etc.

        also supports # for previous tab, % for current tab.

        if undefined, return activeTabId()

    @hidden
*/
//#background_helper
async function idFromIndex(index?: number | "%" | "#" | string): Promise<number> {
    return (await tabFromIndex(index)).id
}

/**
 * Like [[idFromIndex]] but returns the whole tab object
 *
 * @hidden
 */
//#background_helper
async function tabFromIndex(index?: number | "%" | "#" | string): Promise<browser.tabs.Tab> {
    if (index === "#") {
        // Support magic previous/current tab syntax everywhere
        const tabs = await getSortedWinTabs()
        if (tabs.length < 2) {
            // In vim, '#' is the id of the previous buffer even if said buffer has been wiped
            // However, firefox doesn't store tab ids for closed tabs
            // Since vim makes '#' default to the current buffer if only one buffer has ever been opened for the current session, it seems reasonable to return the id of the current tab if only one tab is opened in firefox
            return activeTab()
        }
        return tabs[1]
    } else if (index !== undefined && index !== "%") {
        // Wrap
        index = Number(index)
        index = (index - 1).mod((await browser.tabs.query({ currentWindow: true })).length) + 1

        // Return id of tab with that index.
        return (
            await browser.tabs.query({
                currentWindow: true,
                index: index - 1,
            })
        )[0]
    } else {
        return activeTab()
    }
}

/** Close all other tabs in this window */
//#background
export async function tabonly() {
    const tabs = await browser.tabs.query({
        pinned: false,
        active: false,
        currentWindow: true,
    })
    const tabsIds = tabs.map(tab => tab.id)
    return browser.tabs.remove(tabsIds)
}

/** Duplicate a tab.

    @param index
        The 1-based index of the tab to target. index < 1 wraps. If omitted, this tab.
*/
//#background
export async function tabduplicate(index?: number) {
    return browser.tabs.duplicate(await idFromIndex(index))
}

/** Detach a tab, opening it in a new window.

    @param index
        The 1-based index of the tab to target. index < 1 wraps. If omitted, this tab.
*/
//#background
export async function tabdetach(index?: number) {
    return browser.windows.create({ tabId: await idFromIndex(index) })
}

/** Get list of tabs sorted by most recent use

    @hidden
*/
//#background_helper
async function getSortedWinTabs(): Promise<browser.tabs.Tab[]> {
    const tabs = await browser.tabs.query({ currentWindow: true })
    tabs.sort((a, b) => (a.lastAccessed < b.lastAccessed ? 1 : -1))
    return tabs
}

/** Toggle fullscreen state

*/
//#background
export async function fullscreen() {
    // Could easily extend this to fullscreen / minimise any window but seems like that would be a tiny use-case.
    const currwin = await browser.windows.getCurrent()
    const wid = currwin.id
    // This might have odd behaviour on non-tiling window managers, but no-one uses those, right?
    const state = currwin.state === "fullscreen" ? "normal" : "fullscreen"
    return browser.windows.update(wid, { state })
}

/** Close a tab.

    Known bug: autocompletion will make it impossible to close more than one tab at once if the list of numbers looks enough like an open tab's title or URL.

    @param indexes
        The 1-based indexes of the tabs to target. indexes < 1 wrap. If omitted, this tab.
*/
//#background
export async function tabclose(...indexes: string[]) {
    async function maybeWinTabToTab(id: string) {
        if (id.includes(".")) {
            const [winid, tabindex_number] = await parseWinTabIndex(id)
            return (await browser.tabs.query({ windowId: winid, index: tabindex_number }))[0]
        }
        return tabFromIndex(id)
    }
    const tabs = await Promise.all(indexes.length > 0 ? indexes.map(maybeWinTabToTab) : [activeTab()])
    const tabclosepinned = (await config.getAsync("tabclosepinned")) === "true"
    if (!tabclosepinned) {
        // Pinned tabs should not be closed, abort if one of the tabs is pinned
        for (const tab of tabs) {
            if (tab.pinned) {
                throw new Error(`Tab ${tab.windowId}:${tab.index + 1} is pinned and tabclosepinned is false, aborting tabclose`)
            }
        }
    }
    return browser.tabs.remove(tabs.map(t => t.id))
}

/** Close all tabs to the side specified
 *
 */
//#background
export async function tabcloseallto(side: string) {
    if (!["left", "right"].includes(side)) {
        throw new Error("side argument must be left or right")
    }
    const tabs = await browser.tabs.query({
        pinned: false,
        currentWindow: true,
    })

    const atab = await activeTab()
    const comp = side == "right" ? tab => tab.index > atab.index : tab => tab.index < atab.index
    const ids = tabs.filter(comp).map(tab => tab.id)
    return browser.tabs.remove(ids)
}

/** Restore the most recently closed item.
    The default behaviour is to restore the most recently closed tab in the
    current window unless the most recently closed item is a window.

    Supplying either "tab" or "window" as an argument will specifically only
    restore an item of the specified type. Supplying "tab_strict" only restores
    tabs that were open in the current window.

    @param item
        The type of item to restore. Valid inputs are "recent", "tab", "tab_strict" and "window".
    @return
        The tab or window id of the restored item. Returns -1 if no items are found.
 */
//#background
export async function undo(item = "recent"): Promise<number> {
    const current_win_id: number = (await browser.windows.getCurrent()).id
    const sessions = await browser.sessions.getRecentlyClosed()

    // Pick the first session object that is a window or a tab from this window ("recent"), a tab ("tab"), a tab
    // from this window ("tab_strict"), a window ("window") or pick by sessionId.
    const predicate =
        item === "recent"
            ? s => s.window || (s.tab && s.tab.windowId === current_win_id)
            : item === "tab"
            ? s => s.tab
            : item === "tab_strict"
            ? s => s.tab && s.tab.windowId === current_win_id
            : item === "window"
            ? s => s.window
            : !isNaN(parseInt(item, 10))
            ? s => (s.tab || s.window).sessionId === item
            : () => {
                  throw new Error(`[undo] Invalid argument: ${item}. Must be one of "recent, "tab", "tab_strict", "window" or a sessionId (by selecting a session using the undo completion).`)
              } // this won't throw an error if there isn't anything in the session list, but I don't think that matters
    const session = sessions.find(predicate)

    if (session) {
        browser.sessions.restore((session.tab || session.window).sessionId)
        return (session.tab || session.window).id
    }
    return -1
}

/** Move the current tab to be just in front of the index specified.

    Known bug: This supports relative movement with `tabmove +pos` and `tabmove -pos`, but autocomplete doesn't know that yet and will override positive and negative indexes.

    Put a space in front of tabmove if you want to disable completion and have the relative indexes at the command line.

    Binds are unaffected.

    @param index
        New index for the current tab.

        1,start,^ are aliases for the first index. 0,end,$ are aliases for the last index.
*/
//#background
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

    return browser.tabs.move(aTab.id, { index: newindex })
}

/**
 * Move tabs in current window according to various criteria:
 *
 * - `--containers` groups tabs by containers
 * - `--title` sorts tabs by title
 * - `--url` sorts tabs by url (the default)
 * - `(tab1, tab2) => true|false`
 *      - sort by arbitrary comparison function. `tab{1,2}` are objects with properties described here: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/Tab
 */
//#background
export async function tabsort(...callbackchunks: string[]) {
    const argument = callbackchunks.join(" ")
    const comparator = argument == "--containers" ? (l, r) => l.cookieStoreId < r.cookieStoreId : argument == "--title" ? (l, r) => l.title < r.title : argument == "--url" || argument == "" ? (l, r) => l.url < r.url : (0, eval)(argument)
    const windowTabs = await browser.tabs.query({ currentWindow: true })
    windowTabs.sort(comparator)
    Object.entries(windowTabs).forEach(([index, tab]) => {
        browser.tabs.move(tab.id, { index: parseInt(index, 10) })
    })
}

/** Pin the current tab */
//#background
export async function pin() {
    const aTab = await activeTab()
    return browser.tabs.update(aTab.id, { pinned: !aTab.pinned })
}

/**  Mute current tab or all tabs.

 Passing "all" to the excmd will operate on  the mute state of all tabs.
 Passing "unmute" to the excmd will unmute.
 Passing "toggle" to the excmd will toggle the state of `browser.tabs.tab.MutedInfo`
 @param string[] muteArgs
 */
//#background
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
    let done: Promise<any>
    if (all) {
        const tabs = await browser.tabs.query({ currentWindow: true })
        const promises = []
        for (const tab of tabs) {
            if (toggle) {
                updateObj.muted = !tab.mutedInfo.muted
            }
            promises.push(browser.tabs.update(tab.id, updateObj))
        }
        done = Promise.all(promises)
    } else {
        const tab = await activeTab()
        if (toggle) {
            updateObj.muted = !tab.mutedInfo.muted
        }
        done = browser.tabs.update(tab.id, updateObj)
    }
    return done.then(() => undefined)
}
// }}}

// {{{ WINDOWS
/**
 * Like [[tabopen]], but in a new window.
 *
 * `winopen -private [...]` will open the result in a private window (and won't store the command in your ex-history ;) ).
 *
 * `winopen -popup [...]` will open it in a popup window. You can combine the two for a private popup.
 *
 * `winopen -c containername [...]` will open the result in a container while ignoring other options given. See [[tabopen]] for more details on containers.
 *
 * Example: `winopen -popup -private ddg.gg`
 */
//#background
export async function winopen(...args: string[]) {
    const createData = {} as Parameters<typeof browser.windows.create>[0]
    let firefoxArgs = "--new-window"
    let done = false
    let useContainer = false
    while (!done) {
        switch (args[0]) {
            case "-private":
                createData.incognito = true
                args.shift()
                firefoxArgs = "--private-window"
                break

            case "-popup":
                createData.type = "popup"
                args.shift()
                break

            case "-c":
                if (args.length < 2) throw new Error(`You must provide a container name!`)
                args.shift()
                useContainer = true
                break

            default:
                done = true
                break
        }
    }

    const address = args.join(" ")

    if (useContainer) {
        if (firefoxArgs === "--private-window") {
            throw new Error("Can't open a container in a private browsing window.")
        } else {
            args.unshift("-c")
            return tabopen(...args).then(() => tabdetach())
        }
    }

    if (!ABOUT_WHITELIST.includes(address) && /^(about|file):.*/.exec(address)) {
        return nativeopen(firefoxArgs, address)
    }

    createData.url = "https://fix-a-firefox-bug.invalid"

    return browser.windows.create(createData).then(win => openInTab(win.tabs[0], { loadReplace: true }, address.split(" ")))
}

/**
 * Close a window.
 *
 * @param id - The window id. Defaults to the id of the current window.
 *
 * Example: `winclose`
 */
//#background
export async function winclose(...ids: string[]) {
    if (ids.length === 0) {
        ids.push(`${(await browser.windows.getCurrent()).id}`)
    }
    return Promise.all(ids.map(id => browser.windows.remove(parseInt(id, 10))))
}

/** Close all windows */
// It's unclear if this will leave a session that can be restored.
// We might have to do it ourselves.
//#background
export async function qall() {
    const windows = await browser.windows.getAll()
    return Promise.all(windows.map(window => browser.windows.remove(window.id)))
}

// }}}

// {{{ CONTAINERS

/** Closes all tabs open in the same container across all windows.
  @param name The container name.
 */
//#background
export async function containerclose(name: string) {
    const containerId = await Container.getId(name)
    return browser.tabs.query({ cookieStoreId: containerId }).then(tabs => browser.tabs.remove(tabs.map(tab => tab.id)))
}
/** Creates a new container. Note that container names must be unique and that the checks are case-insensitive.

    Further reading https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/contextualIdentities/ContextualIdentity

    Example usage:
        - `:containercreate tridactyl green dollar`

    @param name The container name. Must be unique.
    @param color The container color. Valid colors are: "blue", "turquoise", "green", "yellow", "orange", "red", "pink", "purple". If no color is chosen a random one will be selected from the list of valid colors.
    @param icon The container icon. Valid icons are: "fingerprint", "briefcase", "dollar", "cart", "circle", "gift", "vacation", "food", "fruit", "pet", "tree", "chill". If no icon is chosen, it defaults to "fingerprint".
 */
//#background
export async function containercreate(name: string, color?: string, icon?: string) {
    await Container.create(name, color, icon)
}

/** Delete a container. Closes all tabs associated with that container beforehand. Note: container names are case-insensitive.
  @param name The container name.
 */
//#background
export async function containerdelete(name: string) {
    if (name == undefined) return
    await containerclose(name)
    await Container.remove(name)
}

/** Update a container's information. Note that none of the parameters are optional and that container names are case-insensitive.

  Example usage:

  - Changing the container name: `:containerupdate banking blockchain green dollar`

  - Changing the container icon: `:containerupdate banking banking green briefcase`

  - Changing the container color: `:containerupdate banking banking purple dollar`

  @param name The container name.
  @param uname The new container name. Must be unique.
  @param ucolor The new container color. Valid colors are: "blue", "turquoise", "green", "yellow", "orange", "red", "pink", "purple". If no color is chosen a random one will be selected from the list of valid colors.
  @param uicon The new container icon. Valid icons are: "fingerprint", "briefcase", "dollar", "cart", "circle", "gift", "vacation", "food", "fruit", "pet", "tree", "chill".
 */
//#background
export async function containerupdate(name: string, uname: string, ucolor: string, uicon: string) {
    logger.debug("containerupdate parameters: " + name + ", " + uname + ", " + ucolor + ", " + uicon)
    const containerId = await Container.fuzzyMatch(name)
    const containerObj = Container.fromString(uname, ucolor, uicon)
    Container.update(containerId, containerObj)
}

/** Shows a list of the current containers in Firefox's native JSON viewer in the current tab.

 NB: Tridactyl cannot run on this page!

 */
//#content
export async function viewcontainers() {
    // # and white space don't agree with FF's JSON viewer.
    // Probably other symbols too.
    const containers = await browserBg.contextualIdentities.query({}) // Can't access src/lib/containers.ts from a content script.
    jsonview(JSON.stringify(containers))
}

/** Opens the current tab in another container.

    This is probably not a good idea if you care about tracking protection!
    Transfering URLs from one container to another allows websites to track
    you across those containers.

    Read more here:
    https://github.com/mozilla/multi-account-containers/wiki/Moving-between-containers

    @param containerName The container name, fuzzy matched like `-c` on [[tabopen]]. Leave empty to uncontain.
 */
//#background
export async function recontain(containerName: string) {
    const thisTab = await activeTab()

    let container
    await Container.fuzzyMatch(containerName)
        .then(match => {
            container = match
        })
        .catch(() => {
            container = Container.DefaultContainer.cookieStoreId
        })

    await openInNewTab(thisTab.url, {
        active: true,
        related: true,
        cookieStoreId: container,
    })
    return browser.tabs.remove(thisTab.id)
}

// }}}
//
// {{{ MISC

//#background
export function version() {
    return fillcmdline_notrail(TRI_VERSION)
}

/**
 *  Switch mode.
 *
 *  For now you probably shouldn't manually switch to other modes than `normal` and `ignore`. Make sure you're aware of the key bindings (ignoremaps) that will allow you to go come back to normal mode from ignore mode before you run `:mode ignore` otherwise you're going to have a hard time re-enabling Tridactyl.
 *
 *  Example:
 *      - `mode ignore` to ignore almost all keys.
 *
 *  If you're looking for a way to temporarily disable Tridactyl, `mode ignore` might be what you're looking for.
 *
 *  Note that when in ignore mode, Tridactyl will not switch to insert mode when focusing text areas/inputs. This is by design.
 *
 *  **New feature:** you can add modes as simply as adding binds with `bind --mode=[newmodename]` and then enter the mode with `mode [newmodename]`.
 */
//#content
export function mode(mode: ModeName) {
    // TODO: event emition on mode change.
    if (mode === "hint") {
        hint()
    } else {
        contentState.mode = mode
    }
}

/** @hidden */
//#background_helper
async function getnexttabs(tabid: number, n?: number) {
    const curIndex: number = (await browser.tabs.get(tabid)).index
    const tabs: browser.tabs.Tab[] = await browser.tabs.query({
        currentWindow: true,
    })
    const indexFilter = ((tab: browser.tabs.Tab) => curIndex <= tab.index && (n ? tab.index < curIndex + Number(n) : true)).bind(n)
    return tabs.filter(indexFilter).map((tab: browser.tabs.Tab) => tab.id)
}

// Moderately slow; should load in results as they arrive, perhaps
// Todo: allow jumping to buffers once they are found
// Consider adding to buffers with incremental search
//      maybe only if no other results in URL etc?
// Find out how to return context of each result
// //#background
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

/** Repeats a `cmd` `n` times.
    If `cmd` doesn't exist, re-executes the last exstr that was executed in the tab.
    Executes the command once if `n` isn't defined either.

    This re-executes the last *exstr*, not the last *excmd*. Some excmds operate internally by constructing and evaluating exstrs, others by directly invoking excmds without going through the exstr parser. For example, aucmds and keybindings evaluate exstrs and are repeatable, while commands like `:bmarks` directly invoke `:tabopen` and you'll repeat the `:bmarks` rather than the internal `:tabopen`.

    It's difficult to execute this in the background script (`:jsb`, `:run_excmd`, `:autocmd TriStart`, `:source`), but if you you do, it will re-execute the last exstr that was executed in the background script. What this may have been is unpredictable and not precisely encouraged.

*/
//#background
export async function repeat(n = 1, ...exstr: string[]) {
    let cmd = state.last_ex_str
    if (exstr.length > 0) cmd = exstr.join(" ")
    logger.debug("repeating " + cmd + " " + n + " times")
    for (let i = 0; i < n; i++) {
        await controller.acceptExCmd(cmd)
    }
}

/**
 * Split `cmds` on pipes (|) and treat each as its own command. Return values are passed as the last argument of the next ex command, e.g,
 *
 * `composite echo yes | fillcmdline` becomes `fillcmdline yes`. A more complicated example is the ex alias, `command current_url composite get_current_url | fillcmdline_notrail `, which is used in, e.g. `bind T current_url tabopen`.
 *
 * Workaround: this should clearly be in the parser, but we haven't come up with a good way to deal with |s in URLs, search terms, etc. yet.
 *
 * `cmds` are also split with semicolons (;) and don't pass things along to each other.
 *
 * If you wish to have a command that has semi-colons in it (e.g. some JavaScript or `hint -;`), first bind a [[command]] to it. For example, `command hint_focus -;`, and then `composite hint_focus; !s xdotool key Menu`.
 *
 * The behaviour of combining ; and | in the same composite command is left as an exercise for the reader.
 */
//#both
export async function composite(...cmds: string[]) {
    try {
        return (
            cmds
                .join(" ")
                // Semicolons delimit pipelines
                .split(";")
                // For each pipeline, wait for previous pipeline to finish, then
                // execute each cmd in pipeline in order, passing the result of the
                // previous cmd as the last argument to the next command.
                .reduce(async (prev_pipeline, cmd) => {
                    await prev_pipeline
                    const cmds = cmd.split("|")

                    // Compute the first piped value.
                    //
                    // We could invoke controller.acceptExCmd, but
                    // that would cause our pipeline section to be
                    // stored as the last executed command for the
                    // purposes of :repeat, which would be
                    // nonsense. So we copy-paste the important
                    // parts of the body of that function instead.
                    const [fn, args] = excmd_parser.parser(cmds[0], ALL_EXCMDS)
                    const first_value = fn.call({}, ...args)

                    // Exec the rest of the pipe in sequence.
                    return cmds.slice(1).reduce(async (pipedValue, cmd) => {
                        const [fn, args] = excmd_parser.parser(cmd, ALL_EXCMDS)
                        return fn.call({}, ...args, await pipedValue)
                    }, first_value)
                }, null as any)
        )
    } catch (e) {
        logger.error(e)
    }
}

/**
 * Escape command for safe use in shell with composite. E.g: `composite js MALICIOUS_WEBSITE_FUNCTION() | shellescape | exclaim ls`
 */
export async function shellescape(...quoteme: string[]) {
    const str = quoteme.join(" ")
    const os = (await browserBg.runtime.getPlatformInfo()).os
    if (os === "win") {
        return escape.windows_cmd(str)
    } else {
        return escape.sh(str)
    }
}

//#background_helper
import { useractions } from "@src/background/user_actions"

/**
 *  Magic escape hatch: if Tridactyl can't run in the current tab, return to a tab in the current window where Tridactyl can run, making such a tab if it doesn't currently exist. If Tridactyl can run in the current tab, return focus to the document body from e.g. the URL bar or a video player.
 *
 *  Only useful if called from a background context, e.g. at the end of an RC file to ensure that when you start the browser you don't get trapped on an about: page, or via `bind --mode=browser escapehatch` (bound to `<C-,>` by default).
 *
 *  NB: when called via `bind --mode=browser`, we return focus from the address bar by opening and closing the "sidebar" (which is used exclusively for this purpose). If escapehatch is called in any other way, we cannot do this as Mozilla thinks it might [spook](https://extensionworkshop.com/documentation/publish/add-on-policies/#no-surprises) [you](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/User_actions) : ).
 *
 *  This sidebar hack will close other sidebars such a TreestyleTabs. You can disable it with `:set escapehatchsidebarhack false`, but Tridactyl will no longer be able to get focus back from certain places such as the address bar.
 *
 */
//#background
export async function escapehatch() {
    useractions.escapehatch()
}

/** Sleep time_ms milliseconds.
 *  This is probably only useful for composite commands that need to wait until the previous asynchronous command has finished running.
 */
//#both
export function sleep(time_ms: number) {
    return new Promise(resolve => setTimeout(resolve, time_ms))
}

/** @hidden */
//#content
export function showcmdline(focus = true) {
    const hidehover = true
    CommandLineContent.show(hidehover)
    let done = Promise.resolve()
    if (focus) {
        CommandLineContent.focus()
        done = Messaging.messageOwnTab("commandline_frame", "focus")
    }
    return done
}

/** @hidden */
//#content
export function hidecmdline() {
    CommandLineContent.hide_and_blur()
}

/** Set the current value of the commandline to string *with* a trailing space */
//#content
export function fillcmdline(...strarr: string[]) {
    const str = strarr.join(" ")
    showcmdline()
    return Messaging.messageOwnTab("commandline_frame", "fillcmdline", [str])
}

/** Set the current value of the commandline to string *without* a trailing space */
//#content
export function fillcmdline_notrail(...strarr: string[]) {
    const str = strarr.join(" ")
    showcmdline()
    return Messaging.messageOwnTab("commandline_frame", "fillcmdline", [str, false])
}

/** Show and fill the command line without focusing it */
//#content
export function fillcmdline_nofocus(...strarr: string[]) {
    showcmdline(false)
    return Messaging.messageOwnTab("commandline_frame", "fillcmdline", [strarr.join(" "), false, false])
}

/** Shows str in the command line for ms milliseconds. Recommended duration: 3000ms. */
//#content
export async function fillcmdline_tmp(ms: number, ...strarr: string[]) {
    const str = strarr.join(" ")
    showcmdline(false)
    Messaging.messageOwnTab("commandline_frame", "fillcmdline", [strarr.join(" "), false, false])
    return new Promise<void>(resolve =>
        setTimeout(async () => {
            if ((await Messaging.messageOwnTab("commandline_frame", "getContent", [])) === str) {
                CommandLineContent.hide_and_blur()
                resolve(Messaging.messageOwnTab("commandline_frame", "clear", [true]))
            }
            resolve()
        }, ms),
    )
}

/**
 * Copy `content` to clipboard without feedback. Use `clipboard yank` for interactive use.
 *
 * e.g. `yank bob` puts "bob" in the clipboard; `composite js document.title | yank` puts the document title in the clipboard.
 */
//#background
export function yank(...content: string[]) {
    return setclip(content.join(" "))
}

/**
 * Copies a string to the clipboard/selection buffer depending on the user's preferences.
 *
 * @hidden
 */
//#background_helper
async function setclip(data: string) {
    // Function to avoid retyping everything everywhere
    const setclip_selection = data => Native.clipboard("set", data)

    let promises: Promise<any>[]
    switch (await config.getAsync("yankto")) {
        case "selection":
            promises = [setclip_selection(data)]
            break
        case "clipboard":
            promises = [setclip_webapi(data)]
            break
        case "both":
            promises = [setclip_selection(data), setclip_webapi(data)]
            break
    }
    return Promise.all(promises)
}

/**
 * Copies a string to the clipboard using the Clipboard API.
 * @hidden
 *
 * Has to be a background helper as it's only available on HTTPS and background pages. We want to be able to copy stuff to the clipboard from HTTP pages too.
 */
//#background_helper
async function setclip_webapi(data: string) {
    return window.navigator.clipboard.writeText(data)
}

/**
 * Fetches the content of the clipboard/selection buffer depending on user's preferences
 *
 * Exposed for use with [[composite]], e.g. `composite getclip | fillcmdline`
 */
//#background
export async function getclip(from?: "clipboard" | "selection") {
    if (from === undefined) from = await config.getAsync("putfrom")
    if (from === "clipboard") {
        return getclip_webapi()
    } else {
        return Native.clipboard("get", "")
    }
}

/**
 * Gets the clipboard content using the Clipboard API.
 * @hidden
 */
//#background_helper
async function getclip_webapi() {
    return window.navigator.clipboard.readText()
}

/** Use the system clipboard.

    If `excmd === "open"`, call [[open]] with the contents of the clipboard. Similarly for [[tabopen]].

    If `excmd === "yank"`, copy the current URL, or if given, the value of toYank, into the system clipboard.

    If `excmd === "yankcanon"`, copy the canonical URL of the current page if it exists, otherwise copy the current URL.

    If `excmd === "yankshort"`, copy the shortlink version of the current URL, and fall back to the canonical then actual URL. Known to work on https://yankshort.neocities.org/.

    If `excmd === "yanktitle"`, copy the title of the open page.

    If `excmd === "yankmd"`, copy the title and url of the open page formatted in Markdown for easy use on sites such as reddit. `yankorg` is similar but for Emacs orgmode.

    If you're on Linux and the native messenger is installed, Tridactyl will call an external binary (either xclip or xsel) to read or write to your X selection buffer. If you want another program to be used, set "externalclipboardcmd" to its name and make sure it has the same interface as xsel/xclip ("-i"/"-o" and reading from stdin).

    When doing a read operation (i.e. open or tabopen), if "putfrom" is set to "selection", the X selection buffer will be read instead of the clipboard. Set "putfrom" to "clipboard" to use the clipboard.

    When doing a write operation, if "yankto" is set to "selection", only the X selection buffer will be written to. If "yankto" is set to "both", both the X selection and the clipboard will be written to. If "yankto" is set to "clipboard", only the clipboard will be written to.

*/
//#background
export async function clipboard(excmd: "open" | "yank" | "yankshort" | "yankcanon" | "yanktitle" | "yankmd" | "yankorg" | "xselpaste" | "tabopen" = "open", ...toYank: string[]) {
    let content = toYank.join(" ")
    let url = ""
    let urls = []
    let done = Promise.resolve(undefined as any)
    switch (excmd) {
        case "yankshort":
            urls = await geturlsforlinks("rel", "shortlink")
            if (urls.length === 0) {
                urls = await geturlsforlinks("rev", "canonical")
            }
            if (urls.length > 0) {
                await yank(urls[0])
                done = fillcmdline_tmp(3000, "# " + urls[0] + " copied to clipboard.")
                break
            }
        // Trying yankcanon if yankshort failed...
        case "yankcanon":
            urls = await geturlsforlinks("rel", "canonical")
            if (urls.length > 0) {
                await yank(urls[0])
                done = fillcmdline_tmp(3000, "# " + urls[0] + " copied to clipboard.")
                break
            }
        // Trying yank if yankcanon failed...
        case "yank":
            content = content === "" ? (await activeTab()).url : content
            await yank(content)
            done = fillcmdline_tmp(3000, "# " + content + " copied to clipboard.")
            break
        case "yanktitle":
            content = (await activeTab()).title
            await yank(content)
            done = fillcmdline_tmp(3000, "# " + content + " copied to clipboard.")
            break
        case "yankmd":
            content = "[" + (await activeTab()).title + "](" + (await activeTab()).url + ")"
            await yank(content)
            done = fillcmdline_tmp(3000, "# " + content + " copied to clipboard.")
            break
        case "yankorg":
            content = "[[" + (await activeTab()).url + "][" + (await activeTab()).title + "]]"
            await yank(content)
            done = fillcmdline_tmp(3000, "# " + content + " copied to clipboard.")
            break
        case "open":
            url = await getclip()
            if (url) {
                done = open(url.trim())
            }
            break
        case "tabopen":
            url = await getclip()
            if (url) {
                done = tabopen(url.trim())
            }
            break
        case "xselpaste":
            content = await getclip("selection")
            if (content.length > 0) {
                EditorCmds.insert_text(content)
            }
            break
        default:
            // todo: maybe we should have some common error and error handler
            throw new Error(`[clipboard] unknown excmd: ${excmd}`)
    }
    return done.then(() => undefined)
}

/** Copy an image to the clipboard.

    @param url
        Absolute URL to the image to be copied. You can obtain an absolute URL from a relative one using [tri.urlutils.getAbsoluteURL](_src_lib_url_util_.html#getabsoluteurl).
*/
//#background
export async function yankimage(url: string): Promise<void> {
    const absoluteUrl = UrlUtil.getAbsoluteURL(url, document.baseURI)
    const image = await window.fetch(absoluteUrl)
    const blob = await image.blob()
    // Blob.type returns a MIME type like "image/jpeg; charset=UTF-8", but the Clipboard API needs a type like "jpeg"
    const imageType = blob.type.split("/")[1].split(";")[0]
    try {
        browser.clipboard.setImageData(await blob.arrayBuffer(), imageType as browser.clipboard._SetImageDataImageType)
    } catch (err) {
        if (err instanceof Error && err.message.includes("imageType")) {
            throw new Error(`Image type ${blob.type} is not supported`)
        } else {
            throw err
        }
    }
}

/** Change active tab.

    @param id
        A bare number means the current window is used. Starts at 1. 0 refers to last tab of the current window, -1 to penultimate tab, etc.

        A string following the following format: "[0-9]+.[0-9]+" means the first number being the index of the window that should be selected and the second one being the index of the tab within that window. [[taball]] has completions for this format.

        "%" denotes the current tab and "#" denotes the tab that was last accessed in this window.
        "P", "A", "M" and "D" indicate tab status (i.e. a pinned, audible, muted or discarded tab.
        Use `:set completions.Tab.statusstylepretty true` to display unicode characters instead.
        "P","A","M","D" can be used to filter by tab status in either setting.

        A non integer string means to search the URL and title for matches, in this window if called from tab, all windows if called from anytab. Title matches can contain '*' as a wildcard.
 */
//#background
export async function tab(...id: string[]) {
    return tab_helper(true, false, ...id)
}

/** Wrapper for [[tab]] with multi-window completions
 */
//#background
export async function taball(...id: string[]) {
    return tab_helper(true, true, ...id)
}

/** Helper to change active tab. Used by [[tab]] and [[taball]].

    @param interactive
        Controls if we should prompt if multiple matches are found, or just pick the first match

    @param anyWindow
        True if we should search in all windows, or just the current one.

    @param key
        String or int tab search key, see [[tab]] for usage.
 */
//#background
export async function tab_helper(interactive: boolean, anyWindow: boolean, ...key: string[]) {
    const id = key.join(" ")
    if (Number.isInteger(Number(id))) return tabIndexSetActive(Number(id))
    if (id === "#") return tabIndexSetActive(id)

    if (id !== null && id !== undefined && !/\d+\.\d+/.exec(id)) {
        let defaultQuery = {}
        if (!anyWindow) defaultQuery = { windowId: (await activeTab()).windowId }

        const results = new Map()
        try {
            ;(await browser.tabs.query({ ...defaultQuery, ...{ url: id } })).forEach(tab => results.set(tab.id, tab))
        } catch (e) {}
        if (results.size < 2) (await browser.tabs.query({ ...defaultQuery, ...{ title: id.replace("*", "\\*") } })).forEach(tab => results.set(tab.id, tab))
        if (results.size < 2) (await browser.tabs.query(defaultQuery)).filter(tab => tab.url.includes(id)).forEach(tab => results.set(tab.id, tab))
        if (results.size < 2) (await browser.tabs.query({ ...defaultQuery, ...{ title: "*" + id + "*" } })).forEach(tab => results.set(tab.id, tab))
        if (results.size) {
            if (interactive && results.size > 1) return fillcmdline_notrail(anyWindow ? "taball" : "tab", id)
            const firstTab = results.values().next().value
            await browser.windows.update(firstTab.windowId, { focused: true })
            return browser.tabs.update(firstTab.id, { active: true })
        }
        throw new Error("No tab found matching: " + id)
    }

    const [winid, tabindex_number] = await parseWinTabIndex(id)
    const tabid = (await browser.tabs.query({ windowId: winid, index: tabindex_number }))[0].id
    await browser.windows.update(winid, { focused: true })
    return browser.tabs.update(tabid, { active: true })
}

// }}}

// }}}

// {{{ SETTINGS

/**
 * Similar to vim's `:command`. Maps one ex-mode command to another.
 * If command already exists, this will override it, and any new commands
 * added in a future release will be SILENTLY overridden. Aliases are
 * expanded recursively.
 *
 * Examples:
 *  - `command t tabopen`
 *  - `command tn tabnext_gt`
 *  - `command hello t` This will expand recursively into 'hello'->'tabopen'
 *
 * Commands/aliases are expanded as in a shell, so, given the commands above,
 * entering `:tn 43` will expand to `:tabnext_gt 43`. You can use this to create
 * your own ex-commands in conjunction with [[js]], specifically `js -p` and `js -d`.
 *
 * Note that this is only for excmd -> excmd mappings. To map a normal-mode
 * command to an excommand, see [[bind]].
 *
 * See also:
 *  - [[comclear]]
 */
//#background
export function command(name: string, ...definition: string[]) {
    // Test if alias creates an alias loop.
    try {
        const def = definition.join(" ")
        aliases.expandExstr(name)
        return config.set("exaliases", name, def)
    } catch (e) {
        config.unset("exaliases", name)
        throw new Error(`Alias not set. ${e}`)
    }
}

/**
 * Similar to vim's `comclear` command. Clears an excmd alias defined by
 * `command`.
 *
 * For example: `comclear helloworld` will reverse any changes caused
 * by `command helloworld xxx`
 *
 * See also:
 *  - [[command]]
 */
//#background
export function comclear(name: string) {
    config.unset("exaliases", name)
}

/** Bind a sequence of keys to an excmd or view bound sequence.

    This is an easier-to-implement bodge while we work on vim-style maps.

    Examples:

        - `bind G fillcmdline tabopen google`
        - `bind D composite tabclose | tab #` -> close current tab and switch to most recent previous tab
        - `bind j scrollline 20`
        - `bind F hint -b`

    You can view binds by omitting the command line:

        - `bind j`
        - `bind k`

    You can bind to modifiers and special keys by enclosing them with angle brackets, for example `bind <C-\>z fullscreen`, `unbind <F1>` (a favourite of people who use TreeStyleTabs :) ), or `bind <Backspace> forward`.

    Modifiers are truncated to a single character, so Ctrl -> C, Alt -> A, and Shift -> S. Shift is a bit special as it is only required if Shift does not change the key inputted, e.g. `<S-ArrowDown>` is OK, but `<S-a>` should just be `A`.

    You can view all special key names here: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values

    Use [[composite]] if you want to execute multiple excmds. Use
    [[fillcmdline]] to put a string in the cmdline and focus the cmdline
    (otherwise the string is executed immediately).

    You can bind to other modes with `bind --mode={insert|ignore|normal|input|ex|hint} ...`, e.g, `bind --mode=insert emacs qall` (NB: unlike vim, all preceeding characters will not be input), or `bind --mode=hint <C-[> hint.reset`.

    `bind --mode=browser [key sequence] [ex command]` binds to a special mode which can be accessed all the time in all browser tabs - even tabs in which Tridactyl cannot run. It comes with a few caveats:

    - you may only have a few browser-mode binds at once. At the time of writing, this is 8, with 3 initially taken by Tridactyl. If you desperately need more, file an [[issue]].
    - the key sequence must consist of a single, simple key with at least one and no more than two modifiers. An error will be thrown if you try to bind to an invalid key sequence.
    - the `ex command` you bind to may not work fully unless you are on a tab which Tridactyl has access to. Generally, browser-wide actions like making or closing tabs will work but tab-specific actions like scrolling down or entering hint mode will not.

    A list of editor functions can be found
    [here](/static/docs/modules/_src_lib_editor_.html).

    See also:

        - [[unbind]]
        - [[reset]]
*/
//#background
export async function bind(...args: string[]) {
    const args_obj = parse_bind_args(...args)
    let p = Promise.resolve()
    if (args_obj.excmd !== "") {
        for (let i = 0; i < args_obj.key.length; i++) {
            // Check if any initial subsequence of the key exists and will shadow the new binding
            const key_sub = args_obj.key.slice(0, i)
            if (config.getDynamic(args_obj.configName, key_sub)) {
                fillcmdline_notrail("# Warning: bind `" + key_sub + "` exists and will shadow `" + args_obj.key + "`. Try running `:unbind --mode=" + args_obj.mode + " " + key_sub + "`")
                break
            }
        }
        if (args_obj.mode == "browser") {
            const commands = await browser.commands.getAll()

            // Check for an existing command with this bind
            let command = commands.filter(c => mozMapToMinimalKey(c.shortcut).toMapstr() == args_obj.key)[0]

            // If there isn't one, find an unused command
            command = command === undefined ? (command = commands.filter(c => c.shortcut === "")[0]) : command
            if (command === undefined) throw new Error("You have reached the maximum number of browser binds. `:unbind` one you don't want from `:viewconfig browsermaps`.")

            await browser.commands.update({ name: command.name, shortcut: minimalKeyToMozMap(mapstrToKeyseq(args_obj.key)[0]) })
            await commandsHelper.updateListener()
        }
        p = config.set(args_obj.configName, args_obj.key, args_obj.excmd)
    } else if (args_obj.key.length) {
        // Display the existing bind
        p = fillcmdline_notrail("#", args_obj.key, "=", config.getDynamic(args_obj.configName, args_obj.key))
    }
    return p
}

/**
 * Like [[bind]] but for a specific url pattern (also see [[seturl]]).
 *
 * @param pattern Mandatory. The regex pattern on which the binding should take effect.
 * @param mode Optional. The mode the binding should be in (e.g. normal, insert, ignore, input). Defaults to normal.
 * @param keys Mandatory. The keys that should be bound.
 * @param excmd Optional. Without it, will display what `keys` are bound to in `mode`.
 *
 */
//#background
export function bindurl(pattern: string, mode: string, keys: string, ...excmd: string[]) {
    const args_obj = parse_bind_args(mode, keys, ...excmd)
    if (args_obj.mode === "browser") throw new Error("Browser-wide binds are not supported per-URL")
    let p = Promise.resolve()
    if (args_obj.excmd !== "") {
        p = config.setURL(pattern, args_obj.configName, args_obj.key, args_obj.excmd)
    } else if (args_obj.key.length) {
        // Display the existing bind
        p = fillcmdline_notrail("#", args_obj.key, "=", config.getURL(pattern, [args_obj.configName, args_obj.key]))
    }
    return p
}

/**
 *  Makes one key equivalent to another for the purposes of most of our parsers. Useful for international keyboard layouts. See user-provided examples for various layouts on our wiki: https://github.com/tridactyl/tridactyl/wiki/Internationalisation
 *
 *  e.g,
 *      keymap ę e
 *
 *  See `:help keytranslatemodes` to enable keymaps in modes other than normal mode.
 */
//#background
export function keymap(source: string, target: string) {
    return set("keytranslatemap." + source, target)
}

/**
 * @hidden
 */
//#background
export function searchsetkeyword() {
    throw new Error(":searchsetkeyword has been deprecated. Use `set searchurls.KEYWORD URL` instead.")
}

/**
 * Validates arguments for set/seturl
 * @hidden
 */
function validateSetArgs(key: string, values: string[]) {
    const target: any[] = key.split(".")

    let value
    const file = Metadata.everything.getFile("src/lib/config.ts")
    const default_config = file.getClass("default_config")
    const md = default_config.getMember(target[0])
    if (md !== undefined) {
        const strval = values.join(" ")
        // Note: the conversion will throw if strval can't be converted to the right type
        if (md.type.kind === "object" && target.length > 1) {
            value = (md.type as ObjectType).convertMember(target.slice(1), strval)
        } else {
            value = md.type.convert(strval)
        }
    } else {
        // If we don't have metadata, fall back to the old way
        logger.warning("Could not fetch setting metadata. Falling back to type of current value.")
        const currentValue = config.get(...target)
        if (Array.isArray(currentValue)) {
            // Do nothing
        } else if (currentValue === undefined || typeof currentValue === "string") {
            value = values.join(" ")
        } else {
            throw new Error("Unsupported setting type!")
        }
    }

    target.push(value)
    return target
}

/**
 * Usage: `seturl [pattern] key values`
 *
 * @param pattern The URL regex pattern the setting should be set for, e.g. `^https://en.wikipedia.org` or `/index.html`. Defaults to the current url if `values` is a single word.
 * @param key The name of the setting you want to set, e.g. `followpagepatterns.next`
 * @param values The value you wish for, e.g. `next`
 *
 * Example:
 * - `seturl .*\.fr followpagepatterns.next suivant`
 * - `seturl website.fr followpagepatterns.next next`
 *
 * When multiple patterns can apply to a same URL, the pattern that has the highest priority is used. You can set the priority of a pattern by using `:seturl pattern priority 10`. By default every pattern has a priority of 10.
 *
 * Note that the patterns a regex-like, not glob-like. This means that if you want to match everything, you need to use `.*` instead of `*`.
 *
 * If you'd like to run an ex-command every time a page loads, see [[autocmd]] instead.
 */
//#content
export function seturl(pattern: string, key: string, ...values: string[]) {
    if (values.length === 0 && key) {
        values = [key]
        key = pattern
        pattern = window.location.href
    }

    if (!pattern || !key || !values.length) {
        throw new Error("seturl syntax: [pattern] key value")
    }

    return config.setURL(pattern, ...validateSetArgs(key, values))
}

/** Set a key value pair in config.

    Use to set any values found [here](/static/docs/classes/_src_lib_config_.default_config.html).

    Arrays should be set using JS syntax, e.g. `:set blacklistkeys ["/",","]`.

    e.g.
        set searchurls.google https://www.google.com/search?q=
        set logging.messaging info

    If no value is given, the value of the of the key will be displayed.

    See also: [[unset]]
*/
//#background
export function set(key: string, ...values: string[]) {
    if (!key) {
        throw new Error("Key must be provided!")
    } else if (!values[0]) {
        return get(key)
    }

    if (key === "noiframeon") {
        const noiframes = config.get("noiframeon")
        // unset previous settings
        if (noiframes) noiframes.forEach(url => seturl(url, "noiframe", "false"))
        // store new settings
        values.forEach(url => seturl(url, "noiframe", "true"))
        // save as deprecated setting for compatibility
        config.set("noiframeon", values)
        throw new Error("Warning: `noiframeon $url1 $url2` has been deprecated in favor of `:seturl $url1 noiframe true`. The right seturl calls have been made for you but from now on please use `:seturl`.")
    }

    if (key === "csp" && values[0] === "clobber") {
        const msg = "#Error: Mozilla asked us to remove our csp-clobbering code. See https://github.com/tridactyl/tridactyl/issues/1800"
        fillcmdline_tmp(3000, msg)
        throw msg
    }

    return config.set(...validateSetArgs(key, values))
}

/**
 * Replaces your local configuration with that stored in the Firefox Sync area.
 *
 * It does not merge your configurations: it overwrites.
 *
 * Also see [[firefoxsyncpush]].
 */
//#background
export function firefoxsyncpull() {
    return config.pull()
}

/**
 * Pushes your local configuration to the Firefox Sync area.
 *
 * It does not merge your configurations: it overwrites.
 *
 * Also see [[firefoxsyncpull]].
 */
//#background
export function firefoxsyncpush() {
    return config.push()
}

/** @hidden */
//#background_helper
const AUCMDS = ["DocStart", "DocLoad", "DocEnd", "TriStart", "TabEnter", "TabLeft", "FullscreenChange", "FullscreenEnter", "FullscreenLeft", "UriChange"].concat(webrequests.requestEvents)
/** Set autocmds to run when certain events happen.
 *
 * @param event Currently, 'TriStart', 'DocStart', 'DocLoad', 'DocEnd', 'TabEnter', 'TabLeft', 'FullscreenChange', 'FullscreenEnter', 'FullscreenLeft', 'UriChange', 'AuthRequired', 'BeforeRedirect', 'BeforeRequest', 'BeforeSendHeaders', 'Completed', 'ErrorOccured', 'HeadersReceived', 'ResponseStarted', and 'SendHeaders' are supported
 *
 * The 'UriChange' event is for "single page applications" which change their URIs without triggering DocStart or DocLoad events. It uses a timer to check whether the URI has changed, which has a small impact on battery life on pages matching the `url` parameter. We suggest using it sparingly.
 *
 * @param url For DocStart, DocEnd, TabEnter, and TabLeft: a JavaScript regex (e.g. `www\.amazon\.co.*`)
 *
 * We just use [URL.search](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/search).
 *
 * For TriStart: A regular expression that matches the hostname of the computer
 * the autocmd should be run on. This requires the native messenger to be
 * installed, except for the ".*" regular expression which will always be
 * triggered, even without the native messenger.
 *
 * For AuthRequired, BeforeRedirect, BeforeRequest, BeforeSendHeaders, Completed, ErrorOccured, HeadersReceived, ResponseStarted and SendHeaders, a [URL match pattern](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns)
 *
 * @param excmd The excmd to run (use [[composite]] to run multiple commands), __except__ for AuthRequired, BeforeRedirect, BeforeRequest, BeforeSendHeaders, Completed, ErrorOccured, HeadersReceived, ResponseStarted and SendHeaders, events where it must be an inline JavaScript function which maps [details objects specific to the event](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest#Events) to [blocking responses](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/BlockingResponse). This JavaScript function will run in the background context.
 *
 * For example: `autocmd BeforeRequest https://www.bbc.co.uk/* () => ({redirectUrl: "https://old.reddit.com"})`. Note the brackets which ensure JavaScript returns a blocking response object rather than interpreting it as a block statement.
 *
 * For DocStart, DocLoad, DocEnd, TabEnter, TabLeft, FullscreenEnter, FullscreenLeft, FullscreenChange and UriChange: magic variables are available which are replaced with the relevant string at runtime:
        - `TRI_FIRED_MOZ_TABID`: Provides Mozilla's `tabID` associated with the fired event.
        - `TRI_FIRED_TRI_TABINDEX`: Provides tridactyls internal tab index associated with the fired event.
        - `TRI_FIRED_MOZ_WINID`: Provides Mozilla's `windowId` associated with the fired event.
        - `TRI_FIRED_MOZ_OPENERTABID`: The ID of the tab that opened this tab.
        - `TRI_FIRED_ACTIVE`: Whether the tab is active in its window. This may be true even if the tab's window is not currently focused.
        - `TRI_FIRED_AUDIBLE`: Indicates whether the tab is producing sound (even if muted).
        - `TRI_FIRED_MUTED`: Indicates whether the tab is muted.
        - `TRI_FIRED_DISCARDED`: Whether the tab is discarded. A discarded tab is one whose content has been unloaded from memory.
        - `TRI_FIRED_HEIGHT`: The height of the tab in pixels.
        - `TRI_FIRED_WIDTH`: The width of the tab in pixels.
        - `TRI_FIRED_HIDDEN`: Whether the tab is hidden.
        - `TRI_FIRED_INCOGNITO`: Whether the tab is in a private browsing window.
        - `TRI_FIRED_ISARTICLE`: True if the tab can be rendered in Reader Mode, false otherwise.
        - `TRI_FIRED_LASTACCESSED`: Time at which the tab was last accessed, in milliseconds since the epoch.
        - `TRI_FIRED_PINNED`: Whether the tab is pinned.
        - `TRI_FIRED_TITLE`: The title of the tab.
        - `TRI_FIRED_URL`: The URL of the document that the tab is displaying.
 *
 * For example: `autocmd DocStart .*example\.com.* zoom 150 false TRI_FIRED_MOZ_TABID`.
 *
 * For debugging, use `:set logging.autocmds debug` and check the Firefox web console. `WebRequest` events have no logging.
 *
 */
//#background
export function autocmd(event: string, url: string, ...excmd: string[]) {
    // rudimentary run time type checking
    // TODO: Decide on autocmd event names
    if (!AUCMDS.includes(event)) throw new Error(event + " is not a supported event.")
    return config.set("autocmds", event, url, excmd.join(" "))
}

/**
 * Automatically open a domain and all its subdomains in a specified container.
 *
 * __NB:__ You should use this command with an -s (sane mode) or -u (URL mode) flag. Usage without a flag uses an incorrect regular expression which may cause weird behaviour and has been left in for compatibility reasons.
 *
 * This function accepts a `-u` flag to treat the pattern as a URL rather than a domain.
 * For example: `autocontain -u ^https?://([^/]*\.|)youtube\.com/ google` is equivalent to `autocontain -s youtube\.com google`
 *
 * For declaring containers that do not yet exist, consider using `auconcreatecontainer true` in your tridactylrc.
 * This allows Tridactyl to automatically create containers from your autocontain directives. Note that they will be random icons and colors.
 *
 * The domain is passed through as a regular expression so there are a few gotchas to be aware of:
 * * Unescaped periods will match *anything*. `autocontain -s google.co.uk work` will match `google!co$uk`. Escape your periods  (i.e. `\.`) or accept that you might get some false positives.
 * * You can use regex in your pattern. `autocontain -s google\.(co\.uk|com) work` will match either `google.co.uk` or `google.com`.
 *
 * This *should* now peacefully coexist with the Temporary Containers and Multi-Account Containers addons. Do not trust this claim. If a fight starts the participants will try to open infinite tabs. It is *strongly* recommended that you use a tridactylrc so that you can abort a sorceror's-apprentice scenario by killing firefox, commenting out all of autocontainer directives in your rc file, and restarting firefox to clean up the mess. There are a number of strange behaviors resulting from limited coordination between extensions. Redirects can be particularly surprising; for example, with `:autocontain -s will-redirect.example.org example` set and `will-redirect.example.org` redirecting to `redirected.example.org`, navigating to `will-redirect.example.org` will result in the new tab being in the `example` container under some conditions and in the `firefox-default` container under others.
 *
 * @param args a regex pattern to match URLs followed by the container to open the URL in.
 */
//#background
export function autocontain(...args: string[]) {
    if (args.length === 0) throw new Error("Invalid autocontain arguments.")

    const urlMode = args[0] === "-u"
    const saneMode = args[0] === "-s"
    if (urlMode || saneMode) {
        args.splice(0, 1)
    }
    if (args.length !== 2) throw new Error("syntax: autocontain [-{u,s}] pattern container")

    let [pattern, container] = args

    if (!urlMode) {
        pattern = saneMode ? `^https?://([^/]*\\.|)${pattern}/` : `^https?://[^/]*${pattern}/`
    }

    return config.set("autocontain", pattern, container)
}

/** Remove autocmds
 @param event An event from [[autocmd]]

 @param url Exactly the "url" you entered when you made the [[autocmd]] you wish to delete. See `:viewconfig autocmds` if you have forgotten.
*/
//#background
export function autocmddelete(event: string, url: string) {
    if (!AUCMDS.includes(event)) throw new Error(`${event} is not a supported event.`)
    if (webrequests.requestEvents.includes(event)) {
        webrequests.unregisterWebRequestAutocmd(event, url)
    }
    return config.unset("autocmds", event, url)
}

/**
 *  Helper function to put Tridactyl into ignore mode on the provided URL.
 *
 *  Simply creates a DocStart [[autocmd]] that runs `mode ignore`. NB: ignore mode does have a few keybinds by default - see `:viewconfig ignoremaps`. These can be unbound with, e.g. `:unbind --mode=ignore <C-o>`, or `:unbindurl [url] --mode=ignore <C-o>`.
 *
 *  Remove sites from the blacklist with `blacklistremove [url]` or `autocmddelete DocStart [url]`.
 *
 *  If you're looking for a way to temporarily disable Tridactyl, this might be what you're looking for.
 *
 *  <!-- this should probably be moved to an ex alias once configuration has better help --!>
 *
 */
//#background
export function blacklistadd(url: string) {
    return autocmd("DocStart", url, "mode ignore")
}

/** Unbind a sequence of keys so that they do nothing at all.

    See also:

        - [[bind]]
        - [[reset]]
*/
//#background
export async function unbind(...args: string[]) {
    const args_obj = parse_bind_args(...args)
    if (args_obj.excmd !== "") throw new Error("unbind syntax: `unbind key`")
    if (args_obj.mode == "browser") {
        const commands = await browser.commands.getAll()

        const command = commands.filter(c => mozMapToMinimalKey(c.shortcut).toMapstr() == args_obj.key)[0]

        // Fail quietly if bind doesn't exist so people can safely run it in their RC files
        if (command !== undefined) {
            await browser.commands.update({ name: command.name, shortcut: "" })
            await commandsHelper.updateListener()
        }
    }

    return config.set(args_obj.configName, args_obj.key, null)
}

/**
 * Unbind a sequence of keys you have set with [[bindurl]]. Note that this **kills** a bind, which means Tridactyl will pass it to the page on `pattern`. If instead you want to use the default setting again, use [[reseturl]].
 *
 * @param pattern a regex to match URLs on which the key should be unbound
 * @param mode Optional. The mode in which the key should be unbound. Defaults to normal.
 * @param keys The keybinding that should be unbound
 *
 * example: `unbindurl jupyter --mode=ignore I`
 *
 * This unbinds `I` in ignore mode on every website the URL of which contains `jupyter`, while keeping the binding active everywhere else.
 *
 * Also see [[bind]], [[bindurl]], [[seturl]], [[unbind]], [[unseturl]]
 */
//#background
export async function unbindurl(pattern: string, mode: string, keys: string) {
    const args_obj = parse_bind_args(mode, keys)

    return config.setURL(pattern, args_obj.configName, args_obj.key, null)
}

/**
 * Restores a sequence of keys to their default value.
 *
 * @param mode Optional. The mode the key should be reset in. Defaults to normal.
 * @param key The key that should be reset.
 *
 * See also:
 *  - [[bind]]
 *  - [[unbind]]
 */
//#background
export async function reset(mode: string, key: string) {
    const args_obj = parse_bind_args(mode, key)
    return config.unset(args_obj.configName, args_obj.key)
}

/**
 * Restores a sequence of keys to their value in the global config for a specific URL pattern.
 *
 * See also:
 *  - [[bind]]
 *  - [[unbind]]
 *  - [[reset]]
 *  - [[bindurl]]
 *  - [[unbindurl]]
 *  - [[seturl]]
 *  - [[unseturl]]
 */
//#background
export async function reseturl(pattern: string, mode: string, key: string) {
    const args_obj = parse_bind_args(mode, key)
    return config.unsetURL(pattern, args_obj.configName, args_obj.key)
}

/** Deletes various bits of Firefox or Tridactyl data

    The list of possible arguments can be found here:
    https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/browsingData/DataTypeSet

    Additional Tridactyl-specific arguments are:
    - `commandline`: Removes the in-memory commandline history.
    - `tridactyllocal`: Removes all tridactyl storage local to this machine. Use it with
        commandline if you want to delete your commandline history.
    - `tridactylsync`: Removes all tridactyl storage associated with your Firefox Account (i.e, all user configuration, by default).
    These arguments aren't affected by the timespan parameter.

    Timespan parameter:
    -t [0-9]+(m|h|d|w)

    Examples:

    - `sanitise all` -> Deletes __everything__, including any saved usernames / passwords(!)
    - `sanitise history` -> Deletes all history
    - `sanitise commandline tridactyllocal tridactylsync` -> Deletes every bit of data Tridactyl holds
    - `sanitise cookies -t 3d` -> Deletes cookies that were set during the last three days.

*/
//#background
export async function sanitise(...args: string[]) {
    const flagpos = args.indexOf("-t")
    let since = {}
    // If the -t flag has been given and there is an arg after it
    if (flagpos > -1) {
        if (flagpos < args.length - 1) {
            const match = /^([0-9])+(m|h|d|w)$/.exec(args[flagpos + 1])
            // If the arg of the flag matches Pentadactyl's sanitisetimespan format
            if (match !== null && match.length === 3) {
                // Compute the timespan in milliseconds and get a Date object
                let millis = parseInt(match[1], 10) * 1000
                switch (match[2]) {
                    case "w":
                        millis *= 7
                    case "d":
                        millis *= 24
                    case "h":
                        millis *= 60
                    case "m":
                        millis *= 60
                }
                since = { since: new Date().getTime() - millis }
            } else {
                throw new Error(":sanitise error: expected time format: ^([0-9])+(m|h|d|w)$, given format:" + args[flagpos + 1])
            }
        } else {
            throw new Error(":sanitise error: -t given but no following arguments")
        }
    }

    const dts = {
        cache: false,
        cookies: false,
        downloads: false,
        formData: false,
        history: false,
        localStorage: false,
        passwords: false,
        serviceWorkers: false,
        // These are Tridactyl-specific
        commandline: false,
        tridactyllocal: false,
        tridactylsync: false,
        /* When this one is activated, a lot of errors seem to pop up in
           the console. Keeping it disabled is probably a good idea.
        "pluginData": false,
         */
        /* These 3 are supported by Chrome and Opera but not by Firefox yet.
        "fileSystems": false,
        "indexedDB": false,
        "serverBoundCertificates": false,
         */
    }
    if (args.find(x => x === "all") !== undefined) {
        for (const attr in dts) if (Object.prototype.hasOwnProperty.call(dts, attr)) dts[attr] = true
    } else {
        // We bother checking if dts[x] is false because
        // browser.browsingData.remove() is very strict on the format of the
        // object it expects
        args.forEach(x => {
            if (dts[x] === false) dts[x] = true
        })
    }
    // Tridactyl-specific items
    if (dts.commandline === true) state.cmdHistory = []
    delete dts.commandline
    if (dts.tridactyllocal === true) await browser.storage.local.clear()
    delete dts.tridactyllocal
    if (dts.tridactylsync === true) await browser.storage.sync.clear()
    delete dts.tridactylsync
    // Global items
    return browser.browsingData.remove(since, dts)
}

/** Bind a quickmark for the current URL or space-separated list of URLs to a key on the keyboard.

    Afterwards use go[key], gn[key], or gw[key] to [[open]], [[tabopen]], or
    [[winopen]] the URL respectively.

    Example:
    - `quickmark m https://mail.google.com/mail/u/0/#inbox`

*/
//#background
export async function quickmark(key: string, ...addressarr: string[]) {
    // ensure we're binding to a single key
    if (key.length !== 1) {
        return
    }

    if (addressarr.length <= 1) {
        const address = addressarr.length === 0 ? (await activeTab()).url : addressarr[0]
        // Have to await these or they race!
        await bind("gn" + key, "tabopen", address)
        await sleep(50)
        await bind("go" + key, "open", address)
        await sleep(50)
        await bind("gw" + key, "winopen", address)
    } else {
        const compstring = addressarr.join("; tabopen ")
        const compstringwin = addressarr.join("; winopen ")
        await bind("gn" + key, "composite tabopen", compstring)
        await sleep(50)
        await bind("go" + key, "composite open", compstring)
        await sleep(50)
        await bind("gw" + key, "composite winopen", compstringwin)
    }
}

/** Puts the contents of config value with keys `keys` into the commandline and the background page console

    It's a bit rubbish, but we don't have a good way to provide feedback to the commandline yet.

    You can view the log entry in the browser console (Ctrl-Shift-j).

    For example, you might try `get nmaps` to see all of your current binds.
*/
//#background
export function get(...keys: string[]) {
    const target = keys.join(".").split(".")
    const value = config.getDynamic(...target)
    console.log(value)
    let done
    if (typeof value === "object") {
        done = fillcmdline_notrail(`# ${keys.join(".")} = ${JSON.stringify(value)}`)
    } else {
        done = fillcmdline_notrail(`# ${keys.join(".")} = ${value}`)
    }
    return done
}

/**
 * Opens the current configuration in Firefox's native JSON viewer in a new tab.
 *
 * @param key - The specific key you wish to view (e.g, nmaps, autocmds.DocLoad). Also accepts the arguments `--default` or `--user` to view the default configuration, or your changes.
 *
 * NB: the configuration won't update if you refresh the page - you need to run `:viewconfig` again.
 *
 */
//#background
export function viewconfig(...key: string[]) {
    // # and white space don't agree with FF's JSON viewer.
    // Probably other symbols too.
    let json
    if (key.length === 0) json = config.get()
    // I think JS casts key to the string "undefined" if it isn't given.
    else if (key[0] === "--default") {
        json = key[1] !== undefined ? config.getDeepProperty(config.o(new config.default_config()), key[1].split(".")) : config.o(new config.default_config())
    } else if (key[0] === "--user") {
        json = key[1] !== undefined ? config.getDeepProperty(config.USERCONFIG, key[1].split(".")) : config.USERCONFIG
    } else {
        json = config.getDynamic(...key.join(".").split("."))
    }
    jsonview(JSON.stringify(json))
}

/**
 * View a JSON object in Firefox's JSON viewer.
 */
//#background
export async function jsonview(...json: string[]) {
    const tab = await tabopen("-w")
    const url = "data:application/json," + encodeURIComponent(json.join(" "))
    return browser.tabs.executeScript(tab.id, { code: `window.location.href = "${url}";` })
}

/**
 * Reset a site-specific setting.
 *
 * usage: `unseturl [pattern] key`
 *
 * @param pattern The pattern the setting should be unset on, e.g. `.*wiki.*`. Defaults to the current url.
 * @param key The key that should be unset.
 *
 * Example: `unseturl youtube.com gimode`
 *
 * Note that this removes a setting from the site-specific config, it doesn't "invert" it. This means that if you have a setting set to `false` in your global config and the same setting set to `false` in a site-specific setting, using `unseturl` will result in the setting still being set to `false`.
 *
 * Also note that `pattern` should match exactly the one that was used when using `seturl`.
 */
//#content
export function unseturl(pattern: string, key: string) {
    if (!key) {
        key = pattern
        pattern = window.location.href
    }
    return config.unsetURL(pattern, key.split("."))
}

/**
 * Reset a config setting to default
 */
//#background
export function unset(...keys: string[]) {
    const target = keys.join(".").split(".")
    if (target === undefined) throw new Error("You must define a target!")
    return config.unset(...target)
}

/**
 * "Delete" a default setting. E.g. `setnull searchurls.github` means `open github test` would search your default search engine for "github test".
 */
//#background
export function setnull(...keys: string[]) {
    const target = keys.join(".").split(".")
    if (target === undefined) throw new Error("You must define a target!")
    return config.set(...target, null)
}

// }}}

/**
 * @hidden
 */
//#content_helper
const KILL_STACK: Element[] = []
// {{{ HINTMODE

/** Hint a page.

    @param args Arguments to the `:hint` command. Multiple flags can be combined as long as they don't conflict.
    Selectors can be specified either standalone (without a flag preceding them) or with the `-c` option. Arguments that
    take callbacks (`-F` or `-W`) should be specified last, as they consume the rest of the command line.

    Hinting action flags (only one can be specified):
        - -t open in a new foreground tab
        - -b open in background
        - -y copy (yank) link's target to clipboard
        - -p copy an element's text to the clipboard
        - -h select an element (as if you click-n-dragged over it)
        - -P copy an element's title/alt text to the clipboard
        - -r read an element's text with text-to-speech
        - -i view an image
        - -I view an image in a new tab
        - -k irreversibly deletes an element from the page (until reload)
        - -K hides an element on the page; hidden elements can be restored using [[elementunhide]].
        - -s save (download) the linked resource
        - -S save the linked image
        - -a save-as the linked resource
        - -A save-as the linked image
        - -; focus an element and set it as the element or the child of the element to scroll
        - -# yank an element's anchor URL to clipboard
        - -w open in new window
        - -wp open in new private window
        - -z scroll an element to the top of the viewport
        - `-pipe selector key` e.g, `-pipe a href` returns the URL of the chosen link on a page. Only makes sense with `composite`, e.g, `composite hint -pipe .some-class>a textContent | yank`. If you don't select a hint (i.e. press <Esc>), will return an empty string. Most useful when used like `-c` to do things other than opening links. NB: the query selector cannot contain any spaces.
        - `-W excmd...` append hint href to excmd and execute, e.g, `hint -W mpvsafe` to open YouTube videos. NB: appending to bare [[exclaim]] is dangerous - see `get exaliases.mpvsafe` for an example of how to to it safely. If you need to use a query selector, use `-pipe` instead.
        - -F [callback] - run a custom callback on the selected hint, e.g. `hint -JF e => {tri.excmds.tabopen("-b",e.href); e.remove()}`.

    Element selection flags:
        - -c [selector] hint links that match the css selector
          - `bind ;c hint -c [class*="expand"],[class="togg"]` works particularly well on reddit and HN
          - this works with most other hint modes, with the caveat that if other hint mode takes arguments your selector must contain no spaces, i.e. `hint -c[yourOtherFlag] [selector] [your other flag's arguments, which may contain spaces]`
        - -f [text] hint links and inputs that display the given text
          - `bind <c-e> hint -f Edit`
          - Backslashes can escape spaces: `bind <c-s> hint -f Save\ as`
        - -fr [text] use RegExp to hint the links and inputs
        - -J* disable javascript hints. Don't generate hints related to javascript events. This is particularly useful when used with the `-c` option when you want to generate only hints for the specified css selectors. Also useful on sites with plenty of useless javascript elements such as google.com
        - -V create hints for invisible elements. By default, elements outside the viewport when calling :hint are not hinted, this includes them anyways.

    Hinting mode selection:
        - -q* quick (or rapid) hints mode. Stay in hint mode until you press <Esc>, e.g. `:hint -qb` to open multiple hints in the background or `:hint -qW excmd` to execute excmd once for each hint. This will return an array containing all elements or the result of executed functions (e.g. `hint -qpipe a href` will return an array of links).
          - For example, use `bind ;jg hint -Jc .rc > .r > a` on google.com to generate hints only for clickable search results of a given query
        - -! execute all hints without waiting for a selection
          - For example, `hint -!bf Comments` opens in background tabs all visible links whose text matches `Comments`

    Deprecated options:
        - -br deprecated, use `-qb` instead

    Excepting the custom selector mode, background hint mode and the "immediate" modifier, each of these hint modes is available by default as `;<option character>`, so e.g. `;y` to yank a link's target; `;g<option character>` starts rapid hint mode for all modes where it makes sense, and some others.

    To open a hint in the background, the default bind is `F`.

    Ex-commands available exclusively in hint mode are listed [here](/static/docs/modules/_src_content_hinting_.html)

    Related settings:
        - "hintchars": "hjklasdfgyuiopqwertnmzxcvb"
        - "hintfiltermode": "simple" | "vimperator" | "vimperator-reflow"
        - "relatedopenpos": "related" | "next" | "last"
        - "hintuppercase": "true" | "false"
        - "hintnames": "short" | "uniform" | "numeric"
        - "hintdelay": 300
        - "hintshift": "true" | "false"
        - "hintautoselect": "true" | "false"

          With "short" names, Tridactyl will generate short hints that
          are never prefixes of each other. With "uniform", Tridactyl
          will generate hints of uniform length. In either case, the
          hints are generated from the set in "hintchars".

          With "numeric" names, hints are always assigned using
          sequential integers, and "hintchars" is ignored. This has the
          disadvantage that some hints are prefixes of others (and you
          need to hit space or enter to select such a hint). But it has
          the advantage that the hints tend to be more predictable
          (e.g., a news site will have the same hints for its
          boilerplate each time you visit it, even if the number of
          links in the main body changes).

    There are some extra hint "modes" that are actually just normal-mode binds. We'll list them here:

    - `;gv` - "open link in MPV" - only available if you have [[native]] installed and `mpv` on your PATH
    - `;m` and `;M` - do a reverse image search using Google in the current tab and a new tab
    - `;x` and `;X` - move cursor to element and perform a real click or ctrl-shift-click (to open in a new foreground tab). Only available on Linux, if you have [[native]] installed and `xdotool` on your PATH

    NB: by default, hinting respects whether links say they should be opened in new tabs (i.e. `target=_blank`). If you wish to override this you can use `:hint -JW open` to force the hints to open in the current tab. JavaScript hints (grey ones) will always open wherever they want, but if you want to include these anyway you can use `:hint -W open`.

*/
//#content
export async function hint(...args: string[]): Promise<any> {
    // Parse configuration and print parsing warnings
    const config = hint_util.HintConfig.parse(args)
    config.printWarnings(logger)

    const hintTabOpen = async (href, active = !config.rapid) => {
        const containerId = await activeTabContainerId()
        if (containerId) {
            return openInNewTab(href, {
                active,
                related: true,
                cookieStoreId: containerId,
            })
        } else {
            return openInNewTab(href, {
                active,
                related: true,
            })
        }
    }

    return new Promise((resolve, reject) => {
        const hintables = config.hintables()

        // If the user specified a callback, eval it, else use the default
        // action which performs the action matching the open mode
        const action = config.callback
            ? (0, eval)(config.callback)
            : (elem: any) => {
                  if (config.pipeAttribute !== null) {
                      // We have an attribute to pipe
                      return elem[config.pipeAttribute]
                  }

                  if (config.excmd) {
                      // We have an excmd to run. By spec, we append the element's href
                      if (elem.href) {
                          // /!\ RACY RACY RACY!
                          run_exstr(config.excmd + " " + elem.href)
                          return elem
                      }

                      // Otherwise, no href so nothing to do
                      return
                  }

                  switch (config.openMode) {
                      case OpenMode.Highlight:
                          const r = document.createRange()
                          r.setStart(elem, 0)
                          r.setEnd(elem, 1)
                          const s = document.getSelection()
                          s.addRange(r)
                          return elem

                      case OpenMode.Images:
                      case OpenMode.ImagesTab:
                          const src = elem.getAttribute("src")
                          if (src) {
                              if (config.openMode === OpenMode.ImagesTab) {
                                  // TODO: await? Other hintTabOpen calls don't seem to use one
                                  hintTabOpen(new URL(src, window.location.href).href)
                              } else {
                                  open(new URL(src, window.location.href).href)
                              }
                              return elem
                          }

                          return

                      case OpenMode.Kill:
                          elem.remove()
                          return elem

                      case OpenMode.KillTridactyl:
                          elem.classList.add("TridactylKilledElem")
                          return elem

                      case OpenMode.SaveResource:
                      case OpenMode.SaveImage:
                      case OpenMode.SaveAsResource:
                      case OpenMode.SaveAsImage:
                          const saveAs = config.openMode === OpenMode.SaveAsResource || config.openMode === OpenMode.SaveAsImage
                          const attr = config.openMode === OpenMode.SaveImage || config.openMode === OpenMode.SaveAsImage ? "src" : "href"
                          Messaging.message("download_background", "downloadUrl", new URL(elem[attr], window.location.href).href, saveAs)
                          return elem

                      case OpenMode.Scroll:
                          elem.scrollIntoView(true)
                          return elem

                      case OpenMode.ScrollFocus:
                          let tabindexAdded = false
                          // img can only be focused when they have the tabindex attribute
                          if (elem instanceof HTMLImageElement && !elem.getAttribute("tabindex")) {
                              elem.setAttribute("tabindex", "-1")
                              tabindexAdded = true
                          }
                          elem.focus()
                          scrolling.setCurrentFocus(elem)
                          // img doesn't get unfocused when its tabindex is removed, so no need to keep it around
                          if (tabindexAdded) elem.removeAttribute("tabindex")
                          return elem

                      case OpenMode.TTSRead:
                          TTS.readText(elem.textContent)
                          return elem

                      case OpenMode.YankAlt:
                          // Yank link alt text
                          // ???: Neither anchors nor links posses an "alt" attribute. I'm assuming that the person who wrote this code also wanted to select the alt text of images
                          return elem.title ? elem.title : elem.alt

                      case OpenMode.YankAnchor:
                          const anchorUrl = new URL(window.location.href)
                          // ???: What purpose does selecting elements with a name attribute have? Selecting values that only have meaning in forms doesn't seem very useful.
                          // https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes
                          anchorUrl.hash = elem.id || elem.name
                          return anchorUrl.href

                      case OpenMode.YankLink:
                          if (elem.href) {
                              return elem.href
                          }

                          return

                      case OpenMode.YankText:
                          return elem.textContent
                  }

                  if (elem.href) {
                      elem.focus()

                      switch (config.openMode) {
                          case OpenMode.Default:
                              DOM.simulateClick(elem)
                              break
                          case OpenMode.Tab:
                              hintTabOpen(elem.href, true).catch(() => DOM.simulateClick(elem))
                              break
                          case OpenMode.BackgroundTab:
                              hintTabOpen(elem.href, false).catch(() => DOM.simulateClick(elem))
                              break
                          case OpenMode.Window:
                              openInNewWindow({ url: new URL(elem.href, window.location.href).href })
                              break
                          case OpenMode.WindowPrivate:
                              openInNewWindow({ url: elem.href, incognito: true })
                              break
                      }
                  } else {
                      if (config.openMode === OpenMode.WindowPrivate) {
                          // We want a private window, but the element doesn't have an href, so
                          // we avoid opening the target by accident
                          return
                      } else {
                          elem.focus()
                          DOM.simulateClick(elem)
                      }
                  }

                  return elem
              }

        if (config.immediate) {
            // Immediate mode, perform the target action on all matching nodes
            const results = []

            for (const elements of hintables) {
                for (const hintable of elements.elements) {
                    try {
                        results.push(action(hintable))
                    } catch (error) {
                        logger.error(error)
                    }
                }
            }

            resolve(results)
        } else {
            // Perform hinting
            hinting.hintPage(hintables, action, resolve, reject, config.rapid)
        }
    }).then(value => {
        // Fix #1374 for all types of yanks: join returned results
        if (config.isYank) {
            if (Array.isArray(value)) {
                yank(value.join("\n"))
            } else {
                yank(value as string)
            }
        }

        return value
    })
}

// how 2 crash pc
////#content
//export async function rapid(...commands: string[]){
//    while(true){
//        await run_exstr(...commands)
//    }
//}

/**
 * Perform rot13.
 *
 * Transforms all text nodes in the current tab via rot13. Only characters in
 * the ASCII range are considered.
 *
 * @param n number of characters to shift.
 */
//#content
export function rot13(n: number) {
    if (n === undefined) n = 13
    const body = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: () => NodeFilter.FILTER_ACCEPT })

    while (body.nextNode()) {
        const t = body.currentNode.textContent
        body.currentNode.textContent = rot13_helper(t, n)
    }
}
/**
 * Perform text jumbling (reibadailty).
 *
 * Shuffles letters except for first and last in all words in text nodes in the current tab. Only characters in
 * the ASCII range are considered.
 *
 * Inspired by: https://www.newscientist.com/letter/mg16221887-600-reibadailty/
 */
//#content
export function jumble() {
    const body = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: () => NodeFilter.FILTER_ACCEPT })

    while (body.nextNode()) {
        const t = body.currentNode.textContent
        body.currentNode.textContent = jumble_helper(t)
    }
}
/**
 * Hacky ex string parser.
 *
 * Use it for fire-and-forget running of background commands in content.
 */
//#content
export function run_exstr(...commands: string[]) {
    return Messaging.message("controller_background", "acceptExCmd", commands.join(""))
}

// }}}

// {{{ GOBBLE mode

/** Initialize gobble mode.

    It will read `nChars` input keys, append them to `endCmd` and execute that
    string.

*/
//#content
export async function gobble(nChars: number, endCmd: string) {
    return gobbleMode.init(nChars, endCmd)
}

// }}}

/**
 * Initialize n [mode] mode.
 *
 * In this special mode, a series of key sequences are executed as bindings from a different mode, as specified by the
 * `mode` argument. After the count of accepted sequences is `n`, the finalizing ex command given as the `endexArr`
 * argument is executed, which defaults to `mode ignore`.
 *
 * Example: `:nmode normal 1 mode ignore`
 * This looks up the next key sequence in the normal mode bindings, executes it, and switches the mode to `ignore`.
 * If the key sequence does not match a binding, it will be silently passed through to Firefox, but it will be counted
 * for the termination condition.
 */
//#content
export async function nmode(mode: string, n: number, ...endexArr: string[]) {
    const endex = endexArr.join(" ") || "mode ignore"
    return nMode.init(endex, mode, n)
}

// {{{TEXT TO SPEECH

/**
 * Read text content of elements matching the given selector
 *
 * @param selector the selector to match elements
 */
//#content_helper
function tssReadFromCss(selector: string): void {
    const elems = DOM.getElemsBySelector(selector, [])

    elems.forEach(e => {
        TTS.readText(e.textContent)
    })
}

/**
 * Read the given text using the browser's text to speech functionality and
 * the settings currently set
 *
 * @param mode      the command mode
 *                      -t read the following args as text
 *                      -c read the content of elements matching the selector
 */
//#content
export async function ttsread(mode: "-t" | "-c", ...args: string[]) {
    if (mode === "-t") {
        // really should quote args, but for now, join
        TTS.readText(args.join(" "))
    } else if (mode === "-c") {
        if (args.length > 0) {
            tssReadFromCss(args[0])
        } else {
            throw new Error("Error: no CSS selector supplied")
        }
    } else {
        throw new Error("Unknown mode for ttsread command: " + mode)
    }
}

/**
 * Show a list of the voices available to the TTS system. These can be
 * set in the config using `ttsvoice`
 */
//#background
export async function ttsvoices() {
    const voices = TTS.listVoices()
    voices.sort()
    // need a better way to show this to the user
    return fillcmdline_notrail("#", voices.join(", "))
}

/**
 * Cancel current reading and clear pending queue
 *
 * Arguments:
 *   - stop:    cancel current and pending utterances
 */
//#content
export async function ttscontrol(action: string) {
    // only pause seems to be working, so only provide access to that
    // to avoid exposing users to things that won't work
    if (action !== "stop") {
        throw new Error("Unknown text-to-speech action: " + action)
    }

    return TTS.doAction(action as TTS.Action)
}

//}}}

// {{{ PERFORMANCE LOGGING

/**
 * Build a set of FilterConfigs from a list of human-input filter
 * specs.
 *
 * @hidden
 */
//#background_helper
export function buildFilterConfigs(filters: string[]): Perf.StatsFilterConfig[] {
    return filters.map((filter: string): Perf.StatsFilterConfig => {
        if (filter.endsWith("/")) {
            return { kind: "ownerName", ownerName: filter.slice(0, -1) }
        } else if (filter === ":start") {
            return { kind: "eventType", eventType: "start" }
        } else if (filter === ":end") {
            return { kind: "eventType", eventType: "end" }
        } else if (filter === ":measure") {
            return { kind: "eventType", eventType: "measure" }
        } else {
            // This used to say `functionName: name`
            // which didn't seem to exist anywhere
            //
            // So at least we return something now
            return { kind: "functionName", functionName: filter }
        }
    })
}

/**
 * Dump the raw json for our performance counters. Filters with
 * trailing slashes are class names, :start | :end | :measure specify
 * what type of sample to pass through, and all others are function
 * names. All filters must match for a sample to be dumped.
 *
 * Tridactyl does not collect performance information by default. To
 * get this data you'll have to set the configuration option
 * `perfcounters` to `"true"`. You may also want to examine the value
 * of `perfsamples`.
 */
//#background
export async function perfdump(...filters: string[]) {
    const filterconfigs = buildFilterConfigs(filters)
    const entries = window.tri.statsLogger.getEntries(...filterconfigs)
    console.log(filterconfigs)
    return open("data:application/json;charset=UTF-8," + JSON.stringify(entries))
}

/**
 * Pretty-print a histogram of execution durations for you. Arguments
 * are as above, with the addition that this automatically filters to
 * counter samples of type :measure.
 *
 * Note that this will display its output by opening a data: url with
 * text in the place of your current tab.
 */
//#background
export async function perfhistogram(...filters: string[]) {
    const filterconfigs = buildFilterConfigs(filters)
    filterconfigs.push({ kind: "eventType", eventType: "measure" })
    const entries = window.tri.statsLogger.getEntries(...filterconfigs)
    if (entries.length === 0) {
        return fillcmdline_tmp(3000, "perfhistogram: No samples found.")
    }
    const histogram = Perf.renderStatsHistogram(entries)
    console.log(histogram)
    return open("data:text/plain;charset=UTF-8;base64," + btoa(histogram))
}

// }}}

// unsupported on android
/**
 * Add or remove a bookmark.
 *
 * Optionally, you may give the bookmark a title. If no URL is given, a bookmark is added for the current page.
 *
 * If a bookmark already exists for the URL, it is removed, even if a title is given.
 *
 * Does not support creation of folders: you'll need to use the Firefox menus for that.
 *
 * @param titlearr Title for the bookmark (can include spaces but not forward slashes, as these are interpreted as folders). If you want to put the bookmark in a folder, you can:
 *  - Specify it exactly: `/Bookmarks Menu/Mozilla Firefox/My New Bookmark Title`
 *  - Specify it by a subset: `Firefox/My New Bookmark Title`
 *  - and leave out the title if you want: `Firefox/`
 */
//#background
export async function bmark(url?: string, ...titlearr: string[]) {
    const auto_url = url == undefined
    url =
        url === undefined
            ? (await activeTab()).url
            : (_ => {
                  try {
                      return new URL(url).href
                  } catch (e) {
                      return new URL("http://" + url).href
                  }
              })()
    let title = titlearr.join(" ")
    // if titlearr is given and we have duplicates, we probably want to give an error here.
    const dupbmarks = await browser.bookmarks.search({ url })
    dupbmarks.forEach(bookmark => browser.bookmarks.remove(bookmark.id))
    if (dupbmarks.length !== 0) return
    const path = title.substring(0, title.lastIndexOf("/") + 1)
    // if title is blank, get it from the current page.
    // technically could race condition if someone switched tabs REALLY quick after
    // bookmarking, but too unlikely to bother with for now
    if (title == "" && auto_url) {
        //retrieve title from current tab
        title = (await activeTab()).title
    }

    if (path != "") {
        const tree = (await browser.bookmarks.getTree())[0] // Why would getTree return a tree? Obviously it returns an array of unit length.
        // I hate recursion.
        const treeClimber = (tree: browser.bookmarks.BookmarkTreeNode, treestr) => {
            if (tree.type !== "folder") return {}
            treestr += tree.title + "/"
            if (!("children" in tree) || tree.children.length === 0) return [{ path: treestr, id: tree.id }]
            return [{ path: treestr, id: tree.id }, tree.children.map(child => treeClimber(child, treestr))]
        }
        const treeClimberResult = treeClimber(tree, "")
        let validpaths = []
        if (treeClimberResult instanceof Array) validpaths = treeClimberResult.flat(Infinity).filter(x => "path" in x)
        title = title.substring(title.lastIndexOf("/") + 1)
        let pathobj = validpaths.find(p => p.path === path)
        // If strict look doesn't find it, be a bit gentler
        if (pathobj === undefined) pathobj = validpaths.find(p => p.path.includes(path))
        //technically an initial title string like `Firefox/` can give us a blank title
        //once we remove the path, so let's fix that
        if (title == "" && auto_url) {
            //retrieve title from current tab
            const currTitle = (await activeTab()).title
            title = currTitle
        }

        if (pathobj !== undefined) {
            return browser.bookmarks.create({ url, title, parentId: pathobj.id })
        } // otherwise, give the user an error, probably with [v.path for v in validpaths]
    }

    return browser.bookmarks.create({ url, title })
}

//#background
export function echo(...str: string[]) {
    return str.join(" ")
}

/** helper function for js and jsb
 *
 * -p to take a single extra argument located at the end of str[]
 * -d[delimiter character] to take a space-separated array of arguments after the delimiter
 * -s to load js script of a source file from the config path
 *
 * @hidden
 */
async function js_helper(str: string[]) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars-experimental
    let JS_ARG = null
    // eslint-disable-next-line @typescript-eslint/no-unused-vars-experimental
    let JS_ARGS = []
    let jsContent: string = null

    let doSource = false
    let fromRC = false
    let separator = null

    while (true) {
        const flag = str[0]

        if (flag == "-p") {
            // arg of -p comes from the end of str[]
            // and we don't know if the user will use it or not
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            JS_ARG = str.pop()
            str.shift()
            continue
        }

        if (flag == "-s") {
            doSource = true
            str.shift()
            continue
        }

        if (flag == "-r") {
            doSource = true
            fromRC = true
            str.shift()
            continue
        }

        // d for delimiter innit
        const match = /-d(.)/.exec(flag)
        if (match !== null) {
            separator = match[1]
            str.shift()
            continue
        }

        break
    }

    if (separator !== null) {
        // user may or may not use JS_ARGS
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        JS_ARGS = str.join(" ").split(separator)[1].split(" ")
        jsContent = str.join(" ").split(separator)[0]
    } else {
        jsContent = str.join(" ")
    }

    if (doSource) {
        let sourcePath = jsContent
        if (fromRC) {
            const sep = "/"
            const rcPath = (await Native.getrcpath("unix")).split(sep).slice(0, -1)
            sourcePath = [...rcPath, sourcePath].join(sep)
        }
        const file = await Native.read(sourcePath)
        if (file.code !== 0) throw new Error("Couldn't read js file " + sourcePath)
        jsContent = file.content
    }

    return (0, eval)(jsContent)
}

/**
 * Lets you execute JavaScript in the page context. If you want to get the result back, use
 *
 *     `composite js ... | fillcmdline`
 *
 *  @returns Last value of the JavaScript statement
 *
 * Usage:
 *
 *        `js [-p] javascript code ... [arg]`
 *
 *        `js [-s|-r|-p] javascript_filename [arg]`
 *
 *   - options
 *     - -p pass an argument to js for use with `composite`. The argument is passed as the last space-separated argument of `js`, i.e. `str[str.length-1]` and stored in the magic variable JS_ARG - see below for example usage.
 *    -d[delimiter character] to take a space-separated array of arguments after the delimiter, stored in the magic variable `JS_ARGS` (which is an array).
 *     - -s load the js source from a Javascript file.
 *     - -r load the js source from a Javascript file relative to your RC file. (NB: will throw an error if no RC file exists)
 *
 * Some of Tridactyl's functions are accessible here via the `tri` object. Just do `console.log(tri)` in the web console on the new tab page to see what's available.
 *
 * If you want to pipe an argument to `js`, you need to use the "-p" flag or "-d" flag with an argument and then use the JS_ARG global variable, e.g:
 *
 *     `composite get_current_url | js -p alert(JS_ARG)`
 *
 * To run JavaScript from a source file:
 *
 *     `js -s ~/JSLib/my_script.js`
 *
 * To run a JavaScript file relative to your RC file, e.g. `~/.config/tridactyl/sample.js`
 *
 *     `js -r sample.js`
 *
 * `js` executes JavaScript in local scope. If you want to reuse the code in other :js calls, you can add your functions or variables into a global namespace, like `window.` or `tri.`, e.g.:
 *
 *     `js tri.hello = function (){ alert("hello world!") };`
 *     `js tri.hello()`
 *
 *  You can use `-d` to make your own ex-commands:
 *
 *      `command loudecho js -d€ window.alert(JS_ARGS.join(" "))€`
 *
 */
/* tslint:disable:no-identical-functions */
//#content
export async function js(...str: string[]) {
    return js_helper(str)
}

/**
 * Lets you execute JavaScript in the background context. All the help from [[js]] applies. Gives you a different `tri` object which has access to more excmds and web-extension APIs.
 */
/* tslint:disable:no-identical-functions */
//#background
export async function jsb(...str: string[]) {
    return js_helper(str)
}

/**
 * Opens a new tab the url of which is "https://github.com/tridactyl/tridactyl/issues/new" and automatically fill add tridactyl, firefox and os version to the issue.
 */
//#content
export async function issue() {
    const newIssueUrl = "https://github.com/tridactyl/tridactyl/issues/new"
    if (window.location.href !== newIssueUrl) {
        return tabopen(newIssueUrl)
    }
    const textarea = document.getElementById("issue_body")
    if (!(textarea instanceof HTMLTextAreaElement)) {
        logger.warning("issue(): Couldn't find textarea element in github issue page.")
        return
    }
    let template = await fetch(browser.runtime.getURL("issue_template.md"))
        .then(resp => resp.body.getReader())
        .then(reader => reader.read())
        .then(r => new TextDecoder("utf-8").decode(r.value))
    if (textarea.value !== template) {
        logger.debug("issue(): Textarea value differs from template, exiting early.")
        return
    }
    const platform = await browserBg.runtime.getPlatformInfo()
    // Remove the bit asking the user
    template = template.replace("*   Operating system:\n", "")
    // Add this piece of information to the top of the template
    template = `Operating system: ${platform.os}\n` + template

    const info = await browserBg.runtime.getBrowserInfo()
    template = template.replace("*   Firefox version (Top right menu > Help > About Firefox):\n\n", "")
    template = `Firefox version: ${info.vendor} ${info.name} ${info.version}\n` + template

    template = template.replace("*   Tridactyl version (`:version`):\n\n", "")
    template = `Tridactyl version: ${TRI_VERSION}\n` + template

    textarea.value = template
}

/**
 * Checks if there are any stable updates available for Tridactyl.
 *
 * Related settings:
 *
 * - `update.nag = true | false` - checks for updates on Tridactyl start.
 * - `update.nagwait = 7` - waits 7 days before nagging you to update.
 * - `update.checkintervalsecs = 86400` - waits 24 hours between checking for an update.
 *
 */
//#background
export async function updatecheck(source: "manual" | "auto_polite" | "auto_impolite" = "manual") {
    const forceCheck = source == "manual"

    // Skip check unless it's due or forced
    if (!(forceCheck || Updates.secondsSinceLastCheck() > config.get("update", "checkintervalsecs"))) {
        return false
    }

    const highestKnownVersion = await Updates.getLatestVersion()
    if (!highestKnownVersion) {
        return false
    }

    if (!Updates.shouldNagForVersion(highestKnownVersion)) {
        if (source == "manual") {
            fillcmdline_tmp(30000, "You're up to date! Tridactyl version " + highestKnownVersion.version + ".")
        }
        return false
    }

    const notify = () => {
        fillcmdline_tmp(30000, "Tridactyl " + highestKnownVersion.version + " is available (you're on " + Updates.getInstalledVersion() + "). Visit about:addons, right click Tridactyl, click 'Find Updates'. Restart Firefox once it has downloaded.")
    }

    // A bit verbose, but I figured it was important to have the logic
    // right when it comes to automatically nagging users about the
    // version they're on.
    if (source == "manual") {
        notify()
    } else if (source == "auto_impolite") {
        logger.debug("Impolitely nagging user to update. Installed, latest: ", Updates.getInstalledVersion(), highestKnownVersion)
        notify()
        Updates.updateLatestNaggedVersion(highestKnownVersion)
    } else if (source == "auto_polite" && !Updates.naggedForVersion(highestKnownVersion)) {
        logger.debug("Politely nagging user to update. Installed, latest: ", Updates.getInstalledVersion(), highestKnownVersion)
        notify()
        Updates.updateLatestNaggedVersion(highestKnownVersion)
    }
}

/**
 * Feed some keys to Tridactyl's parser. E.g. `keyfeed jkjkjkjkjkjkjkjkjkjkjkjkjkjkjkjkjkjkjkjkjkjjkj`.
 *
 * NB:
 *
 * - Does _not_ function like Vim's noremap - `bind j keyfeed j` will cause an infinite loop.
 * - Doesn't work in exmode - i.e. `keyfeed t<CR>` won't work.
 *
 */
//#content
export async function keyfeed(mapstr: string) {
    const keyseq = mapstrToKeyseq(mapstr)
    for (const k of keyseq) {
        KEY_MUNCHER.next(k)
        await sleep(10)
    }
}

/**  Open a welcome page on first install.
 *
 * @hidden
 */
//#background_helper
browser.runtime.onInstalled.addListener(details => {
    if (details.reason === "install") tutor("newtab")
    else if (details.reason === "update") {
        if ((details as any).temporary !== true) {
            updatenative(false)
        } else {
            // Temporary extension has been updated in place
            // Open a new tab where Tridactyl will work for convenience
            tabopen()
        }
    }
})

/** Opens optionsUrl for the selected extension in a popup window.
 *
 * NB: Tridactyl cannot run on this page!
 */
//#background
export async function extoptions(...optionNameArgs: string[]) {
    const optionName = optionNameArgs.join(" ")
    const extensions = await Extensions.listExtensions()
    const selectedExtension = extensions.find(ext => ext.name === optionName)
    return winopen("-popup", selectedExtension.optionsUrl)
}

/**
 * Restore the most recently hidden element. Repeated invocations restore the next-most-recently-hidden element.
 *
 * (Elements can be hidden with `;K` and `:hint -K`.)
 */
//#content
export async function elementunhide() {
    const elem = KILL_STACK.pop()
    elem.className = elem.className.replace("TridactylKilledElem", "")
}
// vim: tabstop=4 shiftwidth=4 expandtab
