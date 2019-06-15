/* tslint:disable:comment-format */
// '//#' is a start point for a simple text-replacement-type macro. See excmds_macros.py

/** # Tridactyl help page

    Use `:help <excmd>` or scroll down to show [[help]] for a particular excmd. If you're still stuck, you might consider reading through the [:tutor](/static/clippy/1-tutor.html) again.

    The default keybinds and settings can be found [here](/static/docs/classes/_src_lib_config_.default_config.html) and active binds can be seen with `:viewconfig nmaps` or with [[bind]].

    Tridactyl also provides a few functions to manipulate text in the command line or text areas that can be found [here](/static/docs/modules/_src_lib_editor_.html). There are also a few commands only available in the command line which can be found [here](/static/docs/modules/_src_commandline_frame_.html).

    Ex-commands available exclusively in hint mode are listed [here](/static/docs/modules/_src_content_hinting_.html)

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

    - To make Tridactyl work on addons.mozilla.org and some other Mozilla domains, you need to open `about:config`, run [[fixamo]] or add a new boolean `privacy.resistFingerprinting.block_mozAddonManager` with the value `true`, and remove the above domains from `extensions.webextensions.restrictedDomains`.
    - Tridactyl can't run on about:\*, some file:\* URIs, view-source:\*, or data:\*, URIs.
    - To change/hide the GUI of Firefox from Tridactyl, you can use [[guiset]] with the native messenger installed (see [[native]] and [[installnative]]). Alternatively, you can edit your userChrome yourself.

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
    [matrix-badge]: https://matrix.to/img/matrix-badge.svg
    [matrix-link]: https://riot.im/app/#/room/#tridactyl:matrix.org
*/
/** ignore this line */

// {{{ setup

// Shared
import * as Messaging from "@src/lib/messaging"
import { browserBg, activeTab, activeTabId, activeTabContainerId, openInNewTab, openInNewWindow, openInTab, ABOUT_WHITELIST } from "@src/lib/webext"
import * as Container from "@src/lib/containers"
import state from "@src/state"
import { contentState, ModeName } from "@src/content/state_content"
import * as UrlUtil from "@src/lib/url_util"
import * as config from "@src/lib/config"
import * as aliases from "@src/lib/aliases"
import * as Logging from "@src/lib/logging"
import * as CSS from "css"
import * as Perf from "@src/perf"
import * as Metadata from "@src/.metadata.generated"
import * as Native from "@src/lib/native"
import * as TTS from "@src/lib/text_to_speech"
import * as excmd_parser from "@src/parsers/exmode"
import * as shell_quote from "node-shell-quote"
export let quote = shell_quote

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
const logger = new Logging.Logger("excmds")

/** @hidden **/
const TRI_VERSION = "REPLACE_ME_WITH_THE_VERSION_USING_SED"

// Import excmd libs
import excmd_rss from "@src/lib/generated/rss"
import excmd_fillcmdline from "@src/lib/generated/fillcmdline"
import excmd_clipboard from "@src/lib/generated/clipboard"
import excmd_open from "@src/lib/generated/open"
import excmd_tabs from "@src/lib/generated/tabs"

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
import { wrap_input, getLineAndColNumber, rot13_helper } from "@src/lib/editor_utils"
import * as finding from "@src/content/finding"
import * as toys from "./content/toys"
import * as hinting from "@src/content/hinting"
import * as gobbleMode from "@src/parsers/gobblemode"

ALL_EXCMDS = {
    "": CTSELF,
    "ex": CtCmdlineCmds,
    "text": CtEditorCmds,
}
// }

import { mapstrToKeyseq } from "@src/lib/keyseq"

//#background_helper
// {

// tslint:disable-next-line:no-unused-declaration
import "@src/lib/number.mod"

import * as BGSELF from "@src/.excmds_background.generated"
import { CmdlineCmds as BgCmdlineCmds } from "@src/background/commandline_cmds"
import { EditorCmds as BgEditorCmds } from "@src/background/editor"
import { flatten } from "@src/lib/itertools"
import { firefoxVersionAtLeast } from "@src/lib/webext"
import * as rc from "@src/background_lib/config_rc"
import * as css_util from "@src/lib/css_util"
import * as Updates from "@src/lib/updates"

ALL_EXCMDS = {
    "": BGSELF,
    "ex": BgCmdlineCmds,
    "text": BgEditorCmds,
}
/** @hidden */
// }

// }}}

// {{{ Native messenger stuff

/** @hidden **/
//#background
export async function getNativeVersion(): Promise<void> {
    Native.getNativeMessengerVersion()
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
//#both
export async function rssexec(url: string, type?: string, ...title: string[]) {
    return excmd_rss.rssexec(url, type, ...title)
}

/**
 * Fills the element matched by `selector` with content and falls back to the last used input if the element can't be found. You probably don't want this; it's used internally for [[editor]].
 *
 * That said, `bind gs fillinput null [Tridactyl](https://addons.mozilla.org/en-US/firefox/addon/tridactyl-vim/) is my favourite add-on` could probably come in handy.
 */
//#content
export async function fillinput(selector: string, ...content: string[]) {
    let inputToFill = document.querySelector(selector)
    if (!inputToFill) inputToFill = DOM.getLastUsedInput()
    if ("value" in inputToFill) {
        (inputToFill as HTMLInputElement).value = content.join(" ")
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
}

/** @hidden */
//#content
export function removeTridactylEditorClass(selector: string) {
    const elem = document.querySelector(selector)
    elem.className = elem.className.replace(" TridactylEditing ", "")
}

/**
 * Opens your favourite editor (which is currently gVim) and fills the last used input with whatever you write into that file.
 * **Requires that the native messenger is installed, see [[native]] and [[installnative]]**.
 *
 * Uses the `editorcmd` config option, default = `auto` looks through a list defined in lib/native.ts try find a sensible combination. If it's a bit slow, or chooses the wrong editor, or gives up completely, set editorcmd to something you want. The command must stay in the foreground until the editor exits.
 *
 * The editorcmd needs to accept a filename, stay in the foreground while it's edited, save the file and exit. By default the filename is added to the end of editorcmd, if you require control over the position of that argument, the first occurrence of %f in editorcmd is replaced with the filename. %l, if it exists, is replaced with the line number of the cursor and %c with the column number. For example:
 * ```
 * set editorcmd terminator -u -e "vim %f -c 'normal %lG%cl'"
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
        wrap_input((t, start, end) => {
            [text, line, col] = getLineAndColNumber(t, start, end)
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
        throw `:editor failed: ${e}`
    } finally {
        removeTridactylEditorClass(selector)
    }
}

/**
 * Like [[guiset]] but quieter.
 */
//#background
export async function guiset_quiet(rule: string, option: string) {
    if (!rule || !option) throw new Error(":guiset requires two arguments. See `:help guiset` for more information.")
    // Could potentially fall back to sending minimal example to clipboard if native not installed

    // Check for native messenger and make sure we have a plausible profile directory
    if (!(await Native.nativegate("0.1.1"))) return
    const profile_dir = await Native.getProfileDir()
    await setpref("toolkit.legacyUserProfileCustomizations.stylesheets", "true")

    // Make backups
    await Native.mkdir(profile_dir + "/chrome", true)
    let cssstr = (await Native.read(profile_dir + "/chrome/userChrome.css")).content
    const cssstrOrig = (await Native.read(profile_dir + "/chrome/userChrome.orig.css")).content
    if (cssstrOrig === "") await Native.write(profile_dir + "/chrome/userChrome.orig.css", cssstr)
    await Native.write(profile_dir + "/chrome/userChrome.css.tri.bak", cssstr)

    // Modify and write new CSS
    if (cssstr === "") cssstr = `@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");`
    const stylesheet = CSS.parse(cssstr)
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
    await guiset_quiet(rule, option)
    return excmd_fillcmdline.fillcmdline_tmp(3000, "userChrome.css written. Please restart Firefox to see the changes.")
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
    const separator = (await browserBg.runtime.getPlatformInfo().os) === "win" ? "\\" : "/"
    // remove the "tridactylrc" bit so that we're left with the directory
    const path =
        (await Native.getrcpath())
            .split(separator)
            .slice(0, -1)
            .join(separator) +
        separator +
        "themes" +
        separator +
        themename +
        ".css"
    const file = await Native.read(path)
    if (file.code !== 0) throw new Error("Couldn't read theme " + path)
    return set("customthemes." + themename, file.content)
}

/** @hidden */
//#background
export async function unloadtheme(themename: string) {
    unset("customthemes." + themename)
}

/** Changes the current theme.
 *
 * If THEMENAME is any of the themes that can be found in the [Tridactyl repo](https://github.com/tridactyl/tridactyl/tree/master/src/static/themes) (e.g. 'dark'), the theme will be loaded from Tridactyl's internal storage.
 *
 * If THEMENAME is set to any other value, Tridactyl will attempt to use its native binary (see [[native]]) in order to load a CSS file named THEMENAME from disk. The CSS file has to be in a directory named "themes" and this directory has to be in the same directory as your tridactylrc.
 *
 * Note that the theme name should NOT contain any dot.
 *
 * Example: `:colourscheme mysupertheme`
 * On linux, this will load ~/.config/tridactyl/themes/mysupertheme.css
 */
//#background
export async function colourscheme(themename: string) {
    // If this is a builtin theme, no need to bother with native messaging stuff
    if (Metadata.staticThemes.includes(themename)) return set("theme", themename)
    if (themename.search("\\.") >= 0) throw new Error(`Theme name should not contain any dots! (given name: ${themename}).`)
    await loadtheme(themename)
    return set("theme", themename)
}

/**
 * Write a setting to your user.js file.
 *
 * @param key The key that should be set. Must not be quoted. Must not contain spaces.
 * @param value The value the key should take. Quoted if a string, unquoted otherwise.
 *
 * Note that not all of the keys Firefox uses are suggested by Tridactyl.
 *
 * e.g.: `setpref general.warnOnAboutConfig false`
 * `setpref extensions.webextensions.restricterDomains ""`
 */
//#background
export function setpref(key: string, ...value: string[]) {
    return Native.writePref(key, value.join(" "))
}

/**
 * Like [[fixamo]] but quieter.
 */
//#background
export async function fixamo_quiet() {
    await setpref("privacy.resistFingerprinting.block_mozAddonManager", "true")
    return setpref("extensions.webextensions.restrictedDomains", '""')
}

/**
 *
 * Simply sets
 * ```js
 *  "privacy.resistFingerprinting.block_mozAddonManager":true
 *  "extensions.webextensions.restrictedDomains":""
 * ```
 * in about:config via user.js so that Tridactyl (and other extensions!) can be used on addons.mozilla.org and other sites.
 *
 * Requires `native` and a `restart`.
 */
//#background
export async function fixamo() {
    await fixamo_quiet()
    excmd_fillcmdline.fillcmdline_tmp(3000, "Permissions added to user.js. Please restart Firefox to make them take affect.")
}

/**
 * Uses the native messenger to open URLs.
 *
 * **Be *seriously* careful with this: you can use it to open any URL you can open in the Firefox address bar.**
 *
 * You've been warned.
 *
 * This uses the [[browser]] setting to know which binary to call. If you need to pass additional arguments to firefox (e.g. '--new-window'), make sure they appear before the url.
 */
//#both
export async function nativeopen(...args: string[]) {
    return excmd_open.nativeopen(...args)
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
    if (await Native.nativegate()) {
        excmd_fillcmdline.fillcmdline((await Native.run(str.join(" "))).content)
    }
} // should consider how to give option to fillcmdline or not. We need flags.

/**
 * Like exclaim, but without any output to the command line.
 */
//#background
export async function exclaim_quiet(...str: string[]) {
    if (await Native.nativegate()) {
        return (await Native.run(str.join(" "))).content
    }
}

/**
 * Tells you if the native messenger is installed and its version.
 *
 */
//#background
export async function native() {
    const version = await Native.getNativeMessengerVersion(true)
    if (version !== undefined) excmd_fillcmdline.fillcmdline("# Native messenger is correctly installed, version " + version)
    else excmd_fillcmdline.fillcmdline("# Native messenger not found. Please run `:installnative` and follow the instructions.")
}

/**
 * Simply copies "curl -fsSl https://raw.githubusercontent.com/tridactyl/tridactyl/master/native/install.sh | bash" to the clipboard and tells the user to run it.
 */
//#background
export async function nativeinstall() {
    const tag = TRI_VERSION.includes("pre") ? "master" : TRI_VERSION
    if ((await browser.runtime.getPlatformInfo()).os === "win") {
        const installstr = (await config.get("win_nativeinstallcmd")).replace("%WINTAG", "-Tag " + tag)
        await yank(installstr)
        excmd_fillcmdline.fillcmdline("# Installation command copied to clipboard. Please paste and run it from cmd.exe, PowerShell, or MinTTY to install the native messenger.")
    } else {
        const installstr = (await config.get("nativeinstallcmd")).replace("%TAG", tag)
        await yank(installstr)
        excmd_fillcmdline.fillcmdline("# Installation command copied to clipboard. Please paste and run it in your shell to install the native messenger.")
    }
}

/** Writes current config to a file.

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
    if (await Native.nativegate("0.1.11") && (!await rc.writeRc(conf, overwrite, file))) logger.error("Could not write RC file")

    return conf
}

/**
 * Runs an RC file from disk.
 *
 * If no argument given, it will try to open ~/.tridactylrc, ~/.config/tridactyl/tridactylrc or $XDG_CONFIG_HOME/tridactyl/tridactylrc in reverse order. You may use a `_` in place of a leading `.` if you wish, e.g, if you use Windows.
 *
 * On Windows, the `~` expands to `%USERPROFILE%`.
 *
 * The RC file is just a bunch of Tridactyl excmds (i.e, the stuff on this help page). Settings persist in local storage; add `sanitise tridactyllocal tridactylsync` to make it more Vim like. There's an [example file](https://raw.githubusercontent.com/cmcaine/tridactyl/master/.tridactylrc) if you want it.
 *
 * @param fileArr the file to open. Must be an absolute path, but can contain environment variables and things like ~.
 */
//#background
export async function source(...fileArr: string[]) {
    const file = fileArr.join(" ") || undefined
    if ((await Native.nativegate("0.1.3")) && !(await rc.source(file))) {
        logger.error("Could not find RC file")
    }
}

/**
 * Same as [[source]] but suppresses all errors
 */
//#background
export async function source_quiet(...fileArr: string[]) {
    try {
        const file = fileArr.join(" ") || undefined
        if (await Native.nativegate("0.1.3", false)) rc.source(file)
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
    const tag = TRI_VERSION.includes("pre") ? "master" : TRI_VERSION
    if (await Native.nativegate("0", interactive)) {
        if ((await browser.runtime.getPlatformInfo()).os === "mac") {
            if (interactive) logger.error("Updating the native messenger on OSX is broken. Please use `:installnative` instead.")
            return
        }
        if ((await browser.runtime.getPlatformInfo()).os === "win") {
            await Native.run((await config.get("win_nativeinstallcmd")).replace("%WINTAG", "-Tag " + tag))
        } else {
            await Native.run((await config.get("nativeinstallcmd")).replace("%TAG", tag))
        }

        if (interactive) native()
    }
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
            excmd_fillcmdline.fillcmdline("#" + reply.content)
            qall()
        } else {
            excmd_fillcmdline.fillcmdline("#" + reply.error)
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
 * If you have the native messenger v>=0.1.9 installed, the function accepts one optional argument, filename, which can be:
 * - An absolute path
 * - A path starting with ~, which will be expanded to your home directory
 * - A relative path, relative to the native messenger executable (e.g. ~/.local/share/tridactyl on linux).
 * If filename is not given, a download dialogue will be opened. If filename is a directory, the file will be saved inside of it, its name being inferred from the URL. If the directories mentioned in the path do not exist or if a file already exists at this path, the file will be kept in your downloads folder and an error message will be given.
 *
 * **NB**: if a non-default save location is chosen, Firefox's download manager will say the file is missing. It is not - it is where you asked it to be saved.
 *
 * @param filename The name the file should be saved as.
 */
//#content
export async function saveas(...filename: string[]) {
    // TODO: replace these uses of Messaging with invocations of the auto_lib.
    if (filename.length > 0) {
        return Messaging.message("download_background", "downloadUrlAs", [window.location.href, filename.join(" ")])
    } else {
        return Messaging.message("download_background", "downloadUrl", [window.location.href, true])
    }
}

// }}}

// }}}

// {{{ PAGE CONTEXT

/** @hidden */
//#content_helper
let JUMPED: boolean

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
    browserBg.sessions.setTabValue(await activeTabId(), "jumps", jumps)
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
    const dummy = new UIEvent("scroll")
    ensure(jumps[page], "list", [{ x: dummy.pageX, y: dummy.pageY }])
    ensure(jumps[page], "cur", 0)
    saveJumps(jumps)
    return jumps
}

/** Calls [[jumpprev]](-n) */
//#content
export function jumpnext(n = 1) {
    jumpprev(-n)
}

/** Similar to Pentadactyl or vim's jump list.
 *
 * When you scroll on a page, either by using the mouse or Tridactyl's key bindings, your position in the page will be saved after jumpdelay milliseconds (`:get jumpdelay` to know how many milliseconds that is). If you scroll again, you'll be able to go back to your previous position by using `:jumpprev 1`. If you need to go forward in the jumplist, use `:jumpprev -1`.
 *
 * Known bug: Tridactyl will use the same jumplist for multiple visits to a same website in the same tab, see [github issue 834](https://github.com/tridactyl/tridactyl/issues/834).
 */
//#content
export function jumpprev(n = 1) {
    curJumps().then(alljumps => {
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
export function addJump(scrollEvent: UIEvent) {
    if (JUMPED) {
        JUMPED = false
        return
    }
    const pageX = scrollEvent.pageX
    const pageY = scrollEvent.pageY
    // Get config for current page
    curJumps().then(alljumps => {
        const jumps = alljumps[getJumpPageId()]
        // Prevent pending jump from being registered
        clearTimeout(jumps.timeoutid)
        // Schedule the registering of the current jump
        jumps.timeoutid = setTimeout(() => {
            const list = jumps.list
            // if the page hasn't moved, stop
            if (list[jumps.cur].x === pageX && list[jumps.cur].y === pageY) return
            // Store the new jump
            // Could removing all jumps from list[cur] to list[list.length] be
            // a better/more intuitive behavior?
            list.push({ x: pageX, y: pageY })
            jumps.cur = jumps.list.length - 1
            saveJumps(alljumps)
        }, config.get("jumpdelay"))
    })
}

//#content_helper
document.addEventListener("scroll", addJump)

// Try to restore the previous jump position every time a page is loaded
//#content_helper
document.addEventListener("load", () => curJumps().then(() => jumpprev(0)))

/** Blur (unfocus) the active element */
//#content
export function unfocus() {
    (document.activeElement as HTMLInputElement).blur()
    contentState.mode = "normal"
}

/** Scrolls the window or any scrollable child element by a pixels on the horizontal axis and b pixels on the vertical axis.
 */
//#content
export async function scrollpx(a: number, b: number) {
    if (!(await scrolling.scroll(a, b, document.documentElement))) scrolling.recursiveScroll(a, b)
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
    if (typeof a === "string" && a.match(/c$/i)) {
        a = (Number(a.replace(/c$/, "")) * 100) / (2 * Math.PI)
    }
    a = Number(a)
    const elem = window.document.scrollingElement || window.document.documentElement
    const percentage = a.clamp(0, 100)
    if (b === "y") {
        const top = elem.getClientRects()[0].top
        window.scrollTo(window.scrollX, (percentage * elem.scrollHeight) / 100)
        if (top === elem.getClientRects()[0].top && (percentage === 0 || percentage === 100)) {
            // scrollTo failed, if the user wants to go to the top/bottom of
            // the page try scrolling.recursiveScroll instead
            scrolling.recursiveScroll(window.scrollX, 1073741824 * (percentage === 0 ? -1 : 1), document.documentElement)
        }
    } else if (b === "x") {
        const left = elem.getClientRects()[0].left
        window.scrollTo((percentage * elem.scrollWidth) / 100, window.scrollY)
        if (left === elem.getClientRects()[0].left && (percentage === 0 || percentage === 100)) {
            scrolling.recursiveScroll(1073741824 * (percentage === 0 ? -1 : 1), window.scrollX, document.documentElement)
        }
    } else {
        window.scrollTo(a, Number(b)) // a,b numbers
    }
}

/** @hidden */
//#content_helper
let lineHeight = null
/** Scrolls the document of its first scrollable child element by n lines.
 *
 *  The height of a line is defined by the site's CSS. If Tridactyl can't get it, it'll default to 22 pixels.
 */
//#content
export function scrollline(n = 1) {
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
    scrolling.recursiveScroll(0, lineHeight * n)
}

/** Scrolls the document by n pages.
 *
 *  The height of a page is the current height of the window.
 */
//#content
export function scrollpage(n = 1) {
    scrollpx(0, window.innerHeight * n)
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
    tabstoreload.forEach(n => browser.tabs.reload(n, reloadProperties))
}

/** Reloads all tabs, bypassing the cache if hard is set to true */
//#background
export async function reloadall(hard = false) {
    const tabs = await browser.tabs.query({ currentWindow: true })
    const reloadprops = { bypassCache: hard }
    tabs.forEach(tab => browser.tabs.reload(tab.id, reloadprops))
}

/** Reloads all tabs except the current one, bypassing the cache if hard is set to true */
//#background
export async function reloadallbut(hard = false) {
    let tabs = await browser.tabs.query({ currentWindow: true })
    const currId = await activeTabId()
    tabs = tabs.filter(tab => tab.id !== currId)
    const reloadprops = { bypassCache: hard }
    tabs.forEach(tab => browser.tabs.reload(tab.id, reloadprops))
}

/** Reload the next n tabs, starting with activeTab. bypass cache for all */
//#background
export async function reloadhard(n = 1) {
    reload(n, true)
}

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
    let p = Promise.resolve()

    // Setting window.location to about:blank results in a page we can't access, tabs.update works.
    if (!ABOUT_WHITELIST.includes(url) && url.match(/^(about|file):.*/)) {
        // Open URLs that firefox won't let us by running `firefox <URL>` on the command line
        p = excmd_open.nativeopen(url)
    } else if (url.match(/^javascript:/)) {
        const bookmarklet = url.replace(/^javascript:/, "")
        ; (document.body as any).append(
            html`
                <script>
                    ${bookmarklet}
                </script>
            `,
        )
    } else {
        p = activeTab().then(tab => openInTab(tab, {}, urlarr))
    }

    return p
}

/**
 * Works exactly like [[open]], but only suggests bookmarks.
 *
 * @param opt Optional. Has to be `-t` in order to make bmarks open your bookmarks in a new tab.
 * @param urlarr any argument accepted by [[open]], or [[tabopen]] if opt is "-t"
 */
//#background
export async function bmarks(opt: string, ...urlarr: string[]) {
    if (opt === "-t") return excmd_open.tabopen(...urlarr)
    else return open(opt, ...urlarr)
}

/**
 * Like [[open]] but doesn't make a new entry in history.
 */
//#content
export async function open_quiet(...urlarr: string[]) {
    const url = urlarr.join(" ")

    if (!ABOUT_WHITELIST.includes(url) && url.match(/^(about|file):.*/)) {
        return excmd_open.nativeopen(url)
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
let sourceElement
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
    if (homepages.length > 0) {
        if (all === "false") open(homepages[homepages.length - 1])
        else {
            homepages.map(t => excmd_open.tabopen(t))
        }
    }
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
            for (const mode of ["nmaps", "imaps", "inputmaps", "ignoremaps"]) {
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

    if ((await activeTab()).url.startsWith(browser.runtime.getURL("static/docs/"))) {
        open(url)
    } else {
        excmd_open.tabopen(url)
    }
}

/** Start the tutorial
 * @param newtab - whether to start the tutorial in a newtab. Defaults to current tab.
 */
//#background
export async function tutor(newtab?: string) {
    const tutor = browser.runtime.getURL("static/clippy/1-tutor.html")
    if (newtab) excmd_open.tabopen(tutor)
    else open(tutor)
}

/**
 * Display Tridactyl's contributors in order of commits in a user-friendly fashion
 */
//#background
export async function credits() {
    const creditspage = browser.runtime.getURL("static/authors.html")
    excmd_open.tabopen(creditspage)
}

/**
 * Cover the current page in an overlay to prevent clicking on links with the mouse to force yourself to use hint mode. Get rid of it by reloading the page.
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
    /* tslint:disable:no-useless-cast */
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
    /* tslint:disable:no-useless-cast */
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
 */
//#content
export function urlincrement(count = 1) {
    const newUrl = UrlUtil.incrementUrl(window.location.href, count)

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
    const parentUrl = UrlUtil.getUrlParent(window.location, count)

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
 *   ```text
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
 * @param mode      The replace mode:
 *  * -t text replace
 *  * -r regexp replace
 *  * -s set the value of the given query
 *  * -q replace the value of the given query
 *  * -Q delete the given query
 *  * -g graft a new path onto URL or parent path of it
 * @param replacement the replacement arguments (depends on mode):
 *  * -t <old> <new>
 *  * -r <regexp> <new> [flags]
 *  * -s <query> <value>
 *  * -q <query> <new_val>
 *  * -Q <query>
 *  * -g <graftPoint> <newPathTail>
 */
//#content
export function urlmodify(mode: "-t" | "-r" | "-s" | "-q" | "-Q" | "-g", ...args: string[]) {
    const oldUrl = new URL(window.location.href)
    let newUrl

    switch (mode) {
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

    // TODO: once we have an arg parser, have a quiet flag that prevents the page from being added to history
    if (newUrl && newUrl !== oldUrl) {
        window.location.replace(newUrl)
    }
}

/** Sets the current page's zoom level anywhere between 30% and 300%.
 *
 * If you overshoot the level while using relative adjustments i.e. level > 300% or level < 30%
 * the zoom level will be set to it's maximum or minimum position.
 *
 * @param level - The zoom level to set.
 * Expects percentages when changing the absolute zoom value and percentage points when making relative adjustments.
 * @param rel - Set the zoom adjustment to be relative to current zoom level.
 */
//#background
export async function zoom(level = 0, rel = "false") {
    level = level > 3 ? level / 100 : level
    if (rel === "false" && (level > 3 || level < 0.3)) {
        throw new Error(`[zoom] level out of range: ${level}`)
    }
    if (rel === "true") {
        level += await browser.tabs.getZoom()

        // Handle overshooting of zoom level.
        if (level > 3) level = 3
        if (level < 0.3) level = 0.3
    }
    browser.tabs.setZoom(level)
}

/** Opens the current page in Firefox's reader mode.
 * You currently cannot use Tridactyl while in reader mode.
 */
//#background
export async function reader() {
    if (await firefoxVersionAtLeast(58)) {
        const aTab = await activeTab()
        if (aTab.isArticle) {
            browser.tabs.toggleReaderMode()
        } // else {
        //  // once a statusbar exists an error can be displayed there
        // }
    }
}

/** @hidden **/
//#content_helper
// {
loadaucmds("DocStart")
window.addEventListener("pagehide", () => loadaucmds("DocEnd"))
window.addEventListener("DOMContentLoaded", () => loadaucmds("DocLoad"))
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
export async function loadaucmds(cmdType: "DocStart" | "DocLoad" | "DocEnd" | "TabEnter" | "TabLeft" | "FullscreenEnter" | "FullscreenLeft" | "FullscreenChange") {
    const aucmds = await config.getAsync("autocmds", cmdType)
    const ausites = Object.keys(aucmds)
    const aukeyarr = ausites.filter(e => window.document.location.href.search(e) >= 0)
    for (const aukey of aukeyarr) {
        controller.acceptExCmd(aucmds[aukey])
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
[role='application']
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
export async function changelistjump(n?: number) {
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

/** Switch to the next tab, wrapping round.

    If increment is specified, move that many tabs forwards.
 */
//#both
export async function tabnext(increment = 1) {
    return excmd_tabs.tabnext(increment)
}

/** Switch to the next tab, wrapping round.

    If an index is specified, go to the tab with that number (this mimics the
    behaviour of `{count}gt` in vim, except that this command will accept a
    count that is out of bounds (and will mod it so that it is within bounds as
    per [[tabmove]], etc)).
 */
//#both
export async function tabnext_gt(index?: number) {
    return excmd_tabs.tabnext_gt(index)
}

/** Switch to the previous tab, wrapping round.

    If increment is specified, move that many tabs backwards.
 */
//#both
export async function tabprev(increment = 1) {
    return excmd_tabs.tabprev(increment)
}

/** Like [[open]], but in a new tab. If no address is given, it will open the newtab page, which can be set with `set newtab [url]`

    Use the `-c` flag followed by a container name to open a tab in said container. Tridactyl will try to fuzzy match a name if an exact match is not found. If any autocontainer directives are configured and -c is not set, Tridactyl will try to use the right container automatically using your configurations.
    Use the `-b` flag to open the tab in the background.
    These two can be combined in any order, but need to be placed as the first arguments.

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
//#both
export async function tabopen(...addressarr: string[]) {
    return excmd_open.tabopen(...addressarr)
}

/** Close all other tabs in this window */
//#both
export async function tabonly() {
    return excmd_tabs.tabonly()
}

/** Duplicate a tab.

    @param index
        The 1-based index of the tab to target. index < 1 wraps. If omitted, this tab.
*/
//#both
export async function tabduplicate(index?: number) {
    return excmd_tabs.tabduplicate(index)
}

/** Detach a tab, opening it in a new window.

    @param index
        The 1-based index of the tab to target. index < 1 wraps. If omitted, this tab.
*/
//#both
export async function tabdetach(index?: number) {
    return excmd_tabs.tabdetach(index)
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
    browser.windows.update(wid, { state })
}

/** Close a tab.

    Known bug: autocompletion will make it impossible to close more than one tab at once if the list of numbers looks enough like an open tab's title or URL.

    @param indexes
        The 1-based indexes of the tabs to target. indexes < 1 wrap. If omitted, this tab.
*/
//#both
export async function tabclose(...indexes: string[]) {
    return excmd_tabs.tabclose(...indexes)
}

/** Close all tabs to the right of the current one
 *
 */
//#both
export async function tabclosealltoright() {
    return excmd_tabs.tabclosealltoright()
}

/** Close all tabs to the left of the current one
 *
 */
//#both
export async function tabclosealltoleft() {
    return excmd_tabs.tabclosealltoleft()
}

/** Restore the most recently closed item.
    The default behaviour is to restore the most recently closed tab in the
    current window unless the most recently closed item is a window.

    Supplying either "tab" or "window" as an argument will specifically only
    restore an item of the specified type.

    @param item
        The type of item to restore. Valid inputs are "recent", "tab" and "window".
    @return
        The tab or window id of the restored item. Returns -1 if no items are found.
 */
//#both
export async function undo(item = "recent"): Promise<number> {
    return excmd_tabs.undo(item)
}

/** Move the current tab to be just in front of the index specified.

    Known bug: This supports relative movement with `tabmove +pos` and `tabmove -pos`, but autocomplete doesn't know that yet and will override positive and negative indexes.

    Put a space in front of tabmove if you want to disable completion and have the relative indexes at the command line.

    Binds are unaffected.

    @param index
        New index for the current tab.

        1,start,^ are aliases for the first index. 0,end,$ are aliases for the last index.
*/
//#both
export async function tabmove(index = "$") {
    return excmd_tabs.tabmove(index)
}

/** Pin the current tab */
//#both
export async function pin() {
    return excmd_tabs.pin()
}

/**  Mute current tab or all tabs.

 Passing "all" to the excmd will operate on  the mute state of all tabs.
 Passing "unmute" to the excmd will unmute.
 Passing "toggle" to the excmd will toggle the state of `browser.tabs.tab.MutedInfo`
 @param string[] muteArgs
 */
//#both
export async function mute(...muteArgs: string[]): Promise<void> {
    return excmd_tabs.mute(...muteArgs)
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
 * Example: `winopen -popup -private ddg.gg`
 */
//#background
export async function winopen(...args: string[]) {
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

    return browser.windows.create(createData).then(win => openInTab(win.tabs[0], { loadReplace: true }, address.split(" ")))
}

/**
 * Close a tab.
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
    windows.forEach(window => browser.windows.remove(window.id))
}

// }}}

// {{{ CONTAINERS

/** Closes all tabs open in the same container across all windows.
  @param name The container name.
 */
//#background
export async function containerclose(name: string) {
    const containerId = await Container.getId(name)
    browser.tabs.query({ cookieStoreId: containerId }).then(tabs => {
        browser.tabs.remove(
            tabs.map(tab => {
                return tab.id
            }),
        )
    })
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
    await Container.update(containerId, containerObj)
}

/** Shows a list of the current containers in Firefox's native JSON viewer in the current tab.

 NB: Tridactyl cannot run on this page!

 */
//#content
export async function viewcontainers() {
    // # and white space don't agree with FF's JSON viewer.
    // Probably other symbols too.
    const containers = await browserBg.contextualIdentities.query({}) // Can't access src/lib/containers.ts from a content script.
    window.location.href =
        "data:application/json," +
        JSON.stringify(containers)
            .replace(/#/g, "%23")
            .replace(/ /g, "%20")
}

// }}}
//
// {{{ MISC

//#both
export function version() {
    excmd_fillcmdline.fillcmdline_notrail(TRI_VERSION)
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
    const indexFilter = ((tab: browser.tabs.Tab) => {
        return curIndex <= tab.index && (n ? tab.index < curIndex + Number(n) : true)
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
//#both
export async function repeat(n = 1, ...exstr: string[]) {
    let cmd = controller.last_ex_str
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
                .reduce(
                    async (prev_pipeline, cmd) => {
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
                    },
                    null as any,
                )
        )
    } catch (e) {
        logger.error(e)
    }
}

/**
 * Escape command for safe use in shell with composite. E.g: `composite js MALICIOUS_WEBSITE_FUNCTION() | shellescape | exclaim ls`
 */
export async function shellescape(...quoteme: string[]) {
    return shell_quote.quote(quoteme)
}

/** Sleep time_ms milliseconds.
 *  This is probably only useful for composite commands that need to wait until the previous asynchronous command has finished running.
 */
//#both
export async function sleep(time_ms: number) {
    await new Promise(resolve => setTimeout(resolve, time_ms))
}

/** Hides the command-line.
 *
 * @hidden
 */
//#both
export function hidecmdline() {
    return excmd_fillcmdline.hidecmdline()
}

/** Set the current value of the commandline to string *with* a trailing space */
//#both
export function fillcmdline(...strarr: string[]) {
    return excmd_fillcmdline.fillcmdline(...strarr)
}

/** Set the current value of the commandline to string *without* a trailing space */
//#both
export function fillcmdline_notrail(...strarr: string[]) {
    return excmd_fillcmdline.fillcmdline_notrail(...strarr)
}

/** Show and fill the command line without focusing it */
//#both
export function fillcmdline_nofocus(...strarr: string[]) {
    return excmd_fillcmdline.fillcmdline_nofocus(...strarr)
}

/** Shows str in the command line for ms milliseconds. Recommended duration: 3000ms. */
//#both
export async function fillcmdline_tmp(ms: number, ...strarr: string[]) {
    return excmd_fillcmdline.fillcmdline_tmp(ms, ...strarr)
}

/**
 * Returns the current URL. For use with [[composite]].
 */
//#content
export async function get_current_url() {
    return window.location.href
}

/**
 * Fetches the content of the clipboard/selection buffer depending on user's preferences
 *
 * Exposed for use with [[composite]], e.g. `composite getclip | fillcmdline`
 */
//#background
export async function getclip(fromm?: "clipboard" | "selection") {
    return excmd_clipboard.getclip(fromm)
}

/**
 * Copy content to clipboard without feedback. Use `clipboard yank` for interactive use.
 */
//#both
export function yank(...content: string[]) {
    return excmd_clipboard.yank(...content)
}

/** Use the system clipboard.

    If `excmd === "open"`, call [[open]] with the contents of the clipboard. Similarly for [[tabopen]].

    If `excmd === "yank"`, copy the current URL, or if given, the value of toYank, into the system clipboard.

    If `excmd === "yankcanon"`, copy the canonical URL of the current page if it exists, otherwise copy the current URL.

    If `excmd === "yankshort"`, copy the shortlink version of the current URL, and fall back to the canonical then actual URL. Known to work on https://yankshort.neocities.org/.

    If `excmd === "yanktitle"`, copy the title of the open page.

    If `excmd === "yankmd"`, copy the title and url of the open page formatted in Markdown for easy use on sites such as reddit.

    If you're on Linux and the native messenger is installed, Tridactyl will call an external binary (either xclip or xsel) to read or write to your X selection buffer. If you want another program to be used, set "externalclipboardcmd" to its name and make sure it has the same interface as xsel/xclip ("-i"/"-o" and reading from stdin).

    When doing a read operation (i.e. open or tabopen), if "putfrom" is set to "selection", the X selection buffer will be read instead of the clipboard. Set "putfrom" to "clipboard" to use the clipboard.

    When doing a write operation, if "yankto" is set to "selection", only the X selection buffer will be written to. If "yankto" is set to "both", both the X selection and the clipboard will be written to. If "yankto" is set to "clipboard", only the clipboard will be written to.

*/
//#both
export async function clipboard(excmd: "open" | "yank" | "yankshort" | "yankcanon" | "yanktitle" | "yankmd" | "xselpaste" | "tabopen" = "open", ...toYank: string[]) {
    return excmd_clipboard.clipboard(excmd, ...toYank)
}

/** Change active tab.

    @param index
        Starts at 1. 0 refers to last tab of the current window, -1 to penultimate tab, etc.

        "#" means the tab that was last accessed in this window

    This is different from [[taball]] because `index` is the position of the tab in the current window.
 */
//#both
export async function tab(index: number | "#") {
    return excmd_tabs.tabIndexSetActive(index)
}

/** Change active tab.

    @param id
        A string following the following format: "[0-9]+.[0-9]+", the first number being the index of the window that should be selected and the second one being the index of the tab within that window.

 */
//#both
export async function taball(id: string) {
    return excmd_tabs.taball(id)
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
 *  = `command hello t` This will expand recursively into 'hello'->'tabopen'
 *
 * Note that this is only for excmd->excmd mappings. To map a normal-mode
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
        throw `Alias not set. ${e}`
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

/** @hidden */
//#background_helper
interface bind_args {
    mode: string
    configName: string
    key: string
    excmd: string
}

/** @hidden */
//#background_helper
function parse_bind_args(...args: string[]): bind_args {
    if (args.length === 0) throw new Error("Invalid bind/unbind arguments.")

    const result = {} as bind_args
    result.mode = "normal"

    // TODO: This mapping is copy-pasted in controller_content.ts,
    // where it constructs the list of parsers. it should be
    // centralized, possibly as part of rewrite for content-local maps
    // and similar.
    const mode2maps = new Map([["normal", "nmaps"], ["ignore", "ignoremaps"], ["insert", "imaps"], ["input", "inputmaps"], ["ex", "exmaps"], ["hint", "hintmaps"]])
    if (args[0].startsWith("--mode=")) {
        result.mode = args.shift().replace("--mode=", "")
    }
    if (!mode2maps.has(result.mode)) {
        result.configName = result.mode + "maps"
    } else {
        result.configName = mode2maps.get(result.mode)
    }

    const key = args.shift()
    // Convert key to internal representation
    result.key = mapstrToKeyseq(key)
        .map(k => k.toMapstr())
        .join("")

    result.excmd = args.join(" ")

    return result
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

    See also:

        - [[unbind]]
        - [[reset]]
*/
//#background
export function bind(...args: string[]) {
    const args_obj = parse_bind_args(...args)
    let p = Promise.resolve()
    if (args_obj.excmd !== "") {
        for (let i = 0; i < args_obj.key.length; i++) {
            // Check if any initial subsequence of the key exists and will shadow the new binding
            const key_sub = args_obj.key.slice(0, i)
            if (config.getDynamic(args_obj.configName, key_sub)) {
                excmd_fillcmdline.fillcmdline_notrail("# Warning: bind `" + key_sub + "` exists and will shadow `" + args_obj.key + "`. Try running `:unbind --mode=" + args_obj.mode + " " + key_sub + "`")
                break
            }
        }
        p = config.set(args_obj.configName, args_obj.key, args_obj.excmd)
    } else if (args_obj.key.length) {
        // Display the existing bind
        p = excmd_fillcmdline.fillcmdline_notrail("#", args_obj.key, "=", config.getDynamic(args_obj.configName, args_obj.key))
    }
    return p
}

/**
 * Like [[bind]] but for a specific url pattern (also see [[seturl]]).
 *
 * @param pattern Mandatory. The pattern on which the binding should take effect.
 * @param mode Optional. The mode the binding should be in (e.g. normal, insert, ignore, input). Defaults to normal.
 * @param keys Mandatory. The keys that should be bound.
 * @param excmd Optional. Without it, will display what `keys` are bound to in `mode`.
 *
 */
//#background
export function bindurl(pattern: string, mode: string, keys: string, ...excmd: string[]) {
    const args_obj = parse_bind_args(mode, keys, ...excmd)
    let p = Promise.resolve()
    if (args_obj.excmd !== "") {
        p = config.setURL(pattern, args_obj.configName, args_obj.key, args_obj.excmd)
    } else if (args_obj.key.length) {
        // Display the existing bind
        p = excmd_fillcmdline.fillcmdline_notrail("#", args_obj.key, "=", config.getURL(pattern, [args_obj.configName, args_obj.key]))
    }
    return p
}

/**
 *  Makes one key equivalent to another for the purposes of most of our parsers. Useful for international keyboard layouts.
 *
 *  e.g,
 *      keymap ę e
 *
 *  See `:help keytranslatemodes` to enable keymaps in modes other than normal mode.
 */
//#background
export function keymap(source: string, target: string) {
    set("keytranslatemap." + source, target)
}

/**
 * @hidden
 */
//#background
export function searchsetkeyword() {
    throw ":searchsetkeyword has been deprecated. Use `set searchurls.KEYWORD URL` instead."
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
            value = (md as any).type.convertMember(target.slice(1), strval)
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
            throw "Unsupported setting type!"
        }
    }

    target.push(value)
    return target
}

/**
 * Usage: `seturl [pattern] key values`
 *
 * @param pattern The URL pattern the setting should be set for, e.g. `en.wikipedia.org` or `/index.html`. Defaults to the current url if `values` is a single word.
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
 */
//#content
export function seturl(pattern: string, key: string, ...values: string[]) {
    if (values.length === 0 && key) {
        values = [key]
        key = pattern
        pattern = window.location.href
    }

    if (!pattern || !key || !values.length) {
        throw "seturl syntax: [pattern] key value"
    }

    return config.setURL(pattern, ...validateSetArgs(key, values))
}

/** Set a key value pair in config.

    Use to set any string values found [here](/static/docs/classes/_src_lib_config_.default_config.html).

    e.g.
        set searchurls.google https://www.google.com/search?q=
        set logging.messaging info

    If no value is given, the value of the of the key will be displayed
*/
//#background
export function set(key: string, ...values: string[]) {
    if (!key) {
        throw "Key must be provided!"
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
        throw "Warning: `noiframeon $url1 $url2` has been deprecated in favor of `:seturl $url1 noiframe true`. The right seturl calls have been made for you but from now on please use `:seturl`."
    }

    return config.set(...validateSetArgs(key, values))
}

/** @hidden */
//#background_helper
const AUCMDS = ["DocStart", "DocLoad", "DocEnd", "TriStart", "TabEnter", "TabLeft", "FullscreenChange", "FullscreenEnter", "FullscreenLeft"]
/** Set autocmds to run when certain events happen.

 @param event Curently, 'TriStart', 'DocStart', 'DocLoad', 'DocEnd', 'TabEnter', 'TabLeft', 'FullscreenChange', 'FullscreenEnter', and 'FullscreenLeft' are supported

 @param url For DocStart, DocEnd, TabEnter, and TabLeft: a fragment of the URL on which the events will trigger, or a JavaScript regex (e.g, `/www\.amazon\.co.*\/`)

 We just use [URL.search](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/search).

 For TriStart: A regular expression that matches the hostname of the computer
 the autocmd should be run on. This requires the native messenger to be
 installed, except for the ".*" regular expression which will always be
 triggered, even without the native messenger.

 @param excmd The excmd to run (use [[composite]] to run multiple commands)

*/
//#background
export function autocmd(event: string, url: string, ...excmd: string[]) {
    // rudimentary run time type checking
    // TODO: Decide on autocmd event names
    if (!AUCMDS.includes(event)) throw event + " is not a supported event."
    config.set("autocmds", event, url, excmd.join(" "))
}

/** Automatically open a domain and all its subdomains in a specified container.
 *
 *  For declaring containers that do not yet exist, consider using `auconscreatecontainer true` in your tridactylrc.
 *  This allows tridactyl to automatically create containers from your autocontain directives. Note that they will be random icons and colors.
 *
 * ** NB: This is an experimental feature, if you encounter issues please create an issue on github. **
 *
 *  The domain is passed through as a regular expression so there are a few gotchas to be aware of:
 *  * Unescaped periods will match *anything*. `autocontain google.co.uk work` will match `google!co$uk`. Escape your periods or accept that you might get some false positives.
 *  * You can use regex in your domain pattern. `autocontain google\,(co\.uk|com) work` will match either `google.co.uk` or `google.com`.
 *
 * This *should* now peacefully coexist with the Temporary Containers and Multi-Account Containers addons. Do not trust this claim. If a fight starts the participants will try to open infinite tabs. It is *strongly* recommended that you use a tridactylrc so that you can abort a sorceror's-apprentice scenario by killing firefox, commenting out all of autocontainer directives in your rc file, and restarting firefox to clean up the mess. There are a number of strange behaviors resulting from limited coordination between extensions. Redirects can be particularly surprising; for example, with `:autocontain will-redirect.example.org example` set and `will-redirect.example.org` redirecting to `redirected.example.org`, navigating to `will-redirect.example.org` will result in the new tab being in the `example` container under some conditions and in the `firefox-default` container under others.
 *
 *  @param domain The domain which will trigger the autoContain directive. Includes all subdomains.
 *  @param container The container to open the url in.
 */
//#background
export function autocontain(domain: string, container: string) {
    config.set("autocontain", domain, container)
}

/** Remove autocmds
 @param event Curently, 'TriStart', 'DocStart', 'DocLoad', 'DocEnd', 'TabEnter', 'TabLeft', 'FullscreenChange', 'FullscreenEnter', and 'FullscreenLeft' are supported

 @param url For DocStart, DocEnd, TabEnter, and TabLeft: a fragment of the URL on which the events will trigger, or a JavaScript regex (e.g, `/www\.amazon\.co.*\/`)
*/
//#background
export function autocmddelete(event: string, url: string) {
    if (!AUCMDS.includes(event)) throw event + " is not a supported event."
    config.unset("autocmds", event, url)
}

/**
 *  Helper function to put Tridactyl into ignore mode on the provided URL.
 *
 *  Simply creates a DocStart [[autocmd]] that runs `mode ignore`.
 *
 *  Due to a Tridactyl bug, the only way to remove these rules once they are set is to delete all of your autocmds with `unset autocmds`.
 *
 *  If you're looking for a way to temporarily disable Tridactyl, this might be what you're looking for.
 *
 *  <!-- this should probably be moved to an ex alias once configuration has better help --!>
 *
 */
//#background
export function blacklistadd(url: string) {
    autocmd("DocStart", url, "mode ignore")
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

    return config.set(args_obj.configName, args_obj.key, "")
}

/**
 * Unbind a sequence of keys you have set with [[bindurl]]. Note that this **kills** a bind, which means Tridactyl will pass it to the page on `pattern`. If instead you want to use the default setting again, use [[reseturl]].
 *
 * @param pattern the url on which the key should be unbound
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

    return config.setURL(pattern, args_obj.configName, args_obj.key, "")
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
 * Restores a sequence of keys to their value in the global config for a specific URL.
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

/** Deletes various privacy-related items.

    The list of possible arguments can be found here:
    https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/browsingData/DataTypeSet

    Additional, tridactyl-specific arguments are:
    - commandline: Removes the in-memory commandline history.
    - tridactyllocal: Removes all tridactyl storage local to this machine. Use it with
        commandline if you want to delete your commandline history.
    - tridactylsync: Removes all tridactyl storage associated with your Firefox Account (i.e, all user configuration, by default).
    These arguments aren't affected by the timespan parameter.

    Timespan parameter:
    -t [0-9]+(m|h|d|w)

    Examples:

    - `sanitise all` -> Deletes everything
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
            const match = args[flagpos + 1].match("^([0-9])+(m|h|d|w)$")
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
        for (const attr in dts) dts[attr] = true
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
    browser.browsingData.remove(since, dts)
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
        await bind("go" + key, "open", address)
        await bind("gw" + key, "winopen", address)
    } else {
        const compstring = addressarr.join(" | tabopen ")
        const compstringwin = addressarr.join(" | winopen ")
        await bind("gn" + key, "composite tabopen", compstring)
        await bind("go" + key, "composite open", compstring)
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
    if (typeof value === "object") {
        excmd_fillcmdline.fillcmdline_notrail(`# ${keys.join(".")} = ${JSON.stringify(value)}`)
    } else {
        excmd_fillcmdline.fillcmdline_notrail(`# ${keys.join(".")} = ${value}`)
    }
}

/** Opens the current configuration in Firefox's native JSON viewer in the current tab.
 *
 * NB: Tridactyl cannot run on this page!
 *
 * @param key - The specific key you wish to view (e.g, nmaps), or `--default` or `--user` to view the default configuration, or your changes.
 *
 */
//#content
export function viewconfig(key?: string) {
    // # and white space don't agree with FF's JSON viewer.
    // Probably other symbols too.
    if (!key)
        window.location.href =
            "data:application/json," +
            JSON.stringify(config.get())
                .replace(/#/g, "%23")
                .replace(/ /g, "%20")
    // I think JS casts key to the string "undefined" if it isn't given.
    else if (key === "--default") {
        window.location.href =
            "data:application/json," +
            JSON.stringify(config.o(new config.default_config()))
                .replace(/#/g, "%23")
                .replace(/ /g, "%20")
    } else if (key === "--user") {
        window.location.href =
            "data:application/json," +
            JSON.stringify(config.USERCONFIG)
                .replace(/#/g, "%23")
                .replace(/ /g, "%20")
    }
        window.location.href =
            "data:application/json," +
            JSON.stringify(config.getDynamic(key))
                .replace(/#/g, "%23")
                .replace(/ /g, "%20")
    // base 64 encoding is a cleverer way of doing this, but it doesn't seem to work for the whole config.
    //window.location.href = "data:application/json;base64," + btoa(JSON.stringify(config.get()))
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
    config.unsetURL(pattern, key.split("."))
}

/**
 * Reset a config setting to default
 */
//#background
export function unset(...keys: string[]) {
    const target = keys.join(".").split(".")
    if (target === undefined) throw "You must define a target!"
    config.unset(...target)
}

// }}}

// {{{ HINTMODE

/** Hint a page.

    @param option
        - -t open in a new foreground tab
        - -b open in background
        - -y copy (yank) link's target to clipboard
        - -p copy an element's text to the clipboard
        - -P copy an element's title/alt text to the clipboard
        - -r read an element's text with text-to-speech
        - -i view an image
        - -I view an image in a new tab
        - -k delete an element from the page
        - -s save (download) the linked resource
        - -S save the linked image
        - -a save-as the linked resource
        - -A save-as the linked image
        - -; focus an element
        - -# yank an element's anchor URL to clipboard
        - -c [selector] hint links that match the css selector
          - `bind ;c hint -c [class*="expand"],[class="togg"]` works particularly well on reddit and HN
        - -f [text] hint links and inputs that display the given text
          - `bind <c-e> hint -f Edit`
        - -fr [text] use RegExp to hint the links and inputs
        - -w open in new window
        - -wp open in new private window
        - -z scroll an element to the top of the viewport
        - `-pipe selector key` e.g, `-pipe a href` returns the key. Only makes sense with `composite`, e.g, `composite hint -pipe * textContent | yank`. If you don't select a hint (i.e. press <Esc>), will return an empty string.
        - `-W excmd...` append hint href to excmd and execute, e.g, `hint -W mpvsafe` to open YouTube videos. NB: appending to bare [[exclaim]] is dangerous - see `get exaliases.mpvsafe` for an example of how to to it safely.
        - -q* quick (or rapid) hints mode. Stay in hint mode until you press <Esc>, e.g. `:hint -qb` to open multiple hints in the background or `:hint -qW excmd` to execute excmd once for each hint. This will return an array containing all elements or the result of executed functions (e.g. `hint -qpipe a href` will return an array of links).
        - -J* disable javascript hints. Don't generate hints related to javascript events. This is particularly useful when used with the `-c` option when you want to generate only hints for the specified css selectors. Also useful on sites with plenty of useless javascript elements such as google.com
          - For example, use `bind ;jg hint -Jc .rc > .r > a` on google.com to generate hints only for clickable search results of a given query
        - -br deprecated, use `-qb` instead

    Excepting the custom selector mode and background hint mode, each of these hint modes is available by default as `;<option character>`, so e.g. `;y` to yank a link's target; `;g<option character>` starts rapid hint mode for all modes where it makes sense, and some others.

    To open a hint in the background, the default bind is `F`.

    Ex-commands available exclusively in hint mode are listed [here](/static/docs/modules/_src_content_hinting_.html)

    Related settings:
        - "hintchars": "hjklasdfgyuiopqwertnmzxcvb"
        - "hintfiltermode": "simple" | "vimperator" | "vimperator-reflow"
        - "relatedopenpos": "related" | "next" | "last"
        - "hintuppercase": "true" | "false"
        - "hintnames": "short" | "uniform" | "numeric"

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
*/
//#content
export async function hint(option?: string, selectors?: string, ...rest: string[]): Promise<any> {
    if (!option) option = ""

    if (option === "-br") option = "-qb"

    // extract flags
    // Note: we need to process 'pipe' separately because it could be interpreted as -p -i -e otherwise
    const pipeIndex = option.indexOf("pipe")
    if (pipeIndex >= 0) {
        option = option.slice(0, pipeIndex) + option.slice(pipeIndex + 1)
    }

    const options = new Set(option.length ? option.slice(1).split("") : [])
    const rapid = options.delete("q")
    const jshints = !options.delete("J")
    const withSelectors = options.delete("c")

    option = "-" + Array.from(options).join("")
    if (pipeIndex >= 0) {
        option = "-pipe"
    }

    let selectHints
    const hintTabOpen = async (href, active = !rapid) => {
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

    switch (option) {
        case "-f":  // Filter links by text
        case "-fr": // Filter links by regex
            let match: string | RegExp
            match = [selectors, ...rest].join(" ")
            if ( option == "-fr" ) {
                match = new RegExp (match);
            }
            selectHints = hinting.pipe_elements(
                hinting.hintByText(match),
                elem => {
                    DOM.simulateClick(elem as HTMLElement)
                    return elem
                },
                rapid,
            )
            break
        case "-b": // Open in background
        case "-t": // Open in foreground
            selectHints = hinting.pipe(
                withSelectors ? [selectors, ...rest].join(" ") : DOM.HINTTAGS_selectors,
                async link => {
                    link.focus()
                    if (link.href) {
                        hintTabOpen(link.href, option === "-t").catch(() => DOM.simulateClick(link))
                    } else {
                        DOM.simulateClick(link)
                    }
                    return link
                },
                rapid,
                jshints,
            )
            break

        case "-y":
            // Yank link
            selectHints = hinting.pipe(
                DOM.HINTTAGS_selectors,
                elem => {
                    // /!\ Warning: This is racy! This can easily be fixed by adding an await but do we want this? yank can be pretty slow, especially with yankto=selection
                    run_exstr("yank " + elem.href)
                    return elem
                },
                rapid,
                jshints,
            )
            break

        case "-p":
            // Yank text content
            selectHints = hinting.pipe_elements(
                DOM.elementsWithText(),
                elem => {
                    // /!\ Warning: This is racy! This can easily be fixed by adding an await but do we want this? yank can be pretty slow, especially with yankto=selection
                    run_exstr("yank " + elem.textContent)
                    return elem
                },
                rapid,
            )
            break

        case "-P":
            // Yank link alt text
            // ???: Neither anchors nor links posses an "alt" attribute. I'm assuming that the person who wrote this code also wanted to select the alt text of images
            // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a
            // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link
            selectHints = hinting.pipe_elements(
                DOM.getElemsBySelector("[title], [alt]", [DOM.isVisible]),
                link => {
                    // /!\ Warning: This is racy! This can easily be fixed by adding an await but do we want this? yank can be pretty slow, especially with yankto=selection
                    run_exstr("yank " + (link.title ? link.title : link.alt))
                    return link
                },
                rapid,
            )
            break

        case "-#":
            // Yank anchor
            selectHints = hinting.pipe_elements(
                DOM.anchors(),
                link => {
                    const anchorUrl = new URL(window.location.href)
                    // ???: What purpose does selecting elements with a name attribute have? Selecting values that only have meaning in forms doesn't seem very useful.
                    // https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes
                    anchorUrl.hash = link.id || link.name
                    // /!\ Warning: This is racy! This can easily be fixed by adding an await but do we want this? yank can be pretty slow, especially with yankto=selection
                    run_exstr("yank " + anchorUrl.href)
                    return link
                },
                rapid,
            )
            break

        case "-W":
            selectHints = hinting.pipe(
                DOM.HINTTAGS_selectors,
                elem => {
                    // /!\ RACY RACY RACY!
                    run_exstr(selectors + " " + rest.join(" ") + " " + elem)
                    return elem
                },
                rapid,
                jshints,
            )
            break

        case "-pipe":
            selectHints = hinting.pipe(
                selectors,
                elem => elem[rest.join(" ")],
                rapid,
                jshints,
            )
            break

        case "-i":
            selectHints = hinting.pipe_elements(
                hinting.hintableImages(),
                elem => {
                    open(new URL(elem.getAttribute("src"), window.location.href).href)
                    return elem
                },
                rapid,
            )
            break

        case "-I":
            selectHints = hinting.pipe_elements(
                hinting.hintableImages(),
                async elem => {
                    await hintTabOpen(new URL(elem.getAttribute("src"), window.location.href).href)
                    return elem
                },
                rapid,
            )
            break

        case "-k":
            selectHints = hinting.pipe_elements(
                hinting.killables(),
                elem => {
                    elem.remove()
                    return elem
                },
                rapid,
            )
            break

        case "-s":
        case "-a":
        case "-S":
        case "-A":
            let elems = []
            // s: don't ask the user where to save the file
            // a: ask the user where to save the file
            let saveAs = true
            if (option[1].toLowerCase() === "s") saveAs = false
            // Lowercase: anchors
            // Uppercase: images
            let attr = "href"
            if (option[1].toLowerCase() === option[1]) {
                attr = "href"
                elems = hinting.saveableElements()
            } else {
                attr = "src"
                elems = hinting.hintableImages()
            }
            selectHints = hinting.pipe_elements(
                elems,
                elem => {
                    Messaging.message("download_background", "downloadUrl", [new URL(elem[attr], window.location.href).href, saveAs])
                    return elem
                },
                rapid,
            )
            break

        case "-;":
            selectHints = hinting.pipe_elements(
                hinting.hintables(selectors),
                elem => {
                    elem.focus()
                    return elem
                },
                rapid,
            )
            break

        case "-r":
            selectHints = hinting.pipe_elements(
                DOM.elementsWithText(),
                elem => {
                    TTS.readText(elem.textContent)
                    return elem
                },
                rapid,
            )
            break

        case "-w":
            selectHints = hinting.pipe_elements(
                hinting.hintables(),
                elem => {
                    elem.focus()
                    if (elem.href) openInNewWindow({ url: new URL(elem.href, window.location.href).href })
                    else DOM.simulateClick(elem)
                    return elem
                },
                rapid,
            )
            break

        case "-wp":
            selectHints = hinting.pipe_elements(
                hinting.hintables(),
                elem => {
                    elem.focus()
                    if (elem.href) return openInNewWindow({ url: elem.href, incognito: true })
                },
                rapid,
            )
            break

        case "-z":
            selectHints = hinting.pipe_elements(
                DOM.elementsWithText(),
                elem => {
                    elem.scrollIntoView(true)
                    return elem
                },
                rapid,
            )
            break

        default:
            selectHints = hinting.pipe(
                withSelectors ? [selectors, ...rest].join(" ") : DOM.HINTTAGS_selectors,
                elem => {
                    DOM.simulateClick(elem as HTMLElement)
                    return elem
                },
                rapid,
                jshints,
            )
    }

    return selectHints
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
    const body = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        { acceptNode:
            (node) => NodeFilter.FILTER_ACCEPT
        }
    )

    while (body.nextNode()) {
        const t = body.currentNode.textContent
       body.currentNode.textContent = rot13_helper(t, n)
    }
}
/**
 * Hacky ex string parser.
 *
 * Use it for fire-and-forget running of background commands in content.
 */
//#content
export function run_exstr(...commands: string[]) {
    return Messaging.message("controller_background", "acceptExCmd", commands)
}

// }}}

// {{{ GOBBLE mode

/** Initialize gobble mode.

    It will read `nChars` input keys, append them to `endCmd` and execute that
    string.

*/
//#content
export async function gobble(nChars: number, endCmd: string) {
    gobbleMode.init(nChars, endCmd)
}

// }}}

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
            throw "Error: no CSS selector supplied"
        }
    } else {
        throw "Unknown mode for ttsread command: " + mode
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
    excmd_fillcmdline.fillcmdline_notrail("#", voices.join(", "))
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

    TTS.doAction(action as TTS.Action)
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
    return filters.map(
        (filter: string): Perf.StatsFilterConfig => {
            if (filter.endsWith("/")) {
                return { kind: "ownerName", ownerName: filter.slice(0, -1) }
            } else if (filter === ":start") {
                return { kind: "eventType", eventType: "start" }
            } else if (filter === ":end") {
                return { kind: "eventType", eventType: "end" }
            } else if (filter === ":measure") {
                return { kind: "eventType", eventType: "measure" }
            } else {
                return { kind: "functionName", functionName: name }
            }
        },
    )
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
    open("data:application/json;charset=UTF-8," + JSON.stringify(entries))
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
        excmd_fillcmdline.fillcmdline_tmp(3000, "perfhistogram: No samples found.")
        return
    }
    const histogram = Perf.renderStatsHistogram(entries)
    console.log(histogram)
    open("data:text/plain;charset=UTF-8;base64," + btoa(histogram))
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
    const auto_url = (url == undefined)
    url = url === undefined ? (await activeTab()).url : (_ => {
        try {
            return (new URL(url).href)
        } catch (e) {
            return (new URL("http://" + url).href)
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
        const treeClimber = (tree, treestr) => {
            if (tree.type !== "folder") return {}
            treestr += tree.title + "/"
            if (!("children" in tree) || tree.children.length === 0) return { path: treestr, id: tree.id }
            return [{ path: treestr, id: tree.id }, tree.children.map(child => treeClimber(child, treestr))]
        }
        const validpaths = flatten(treeClimber(tree, "")).filter(x => "path" in x)
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
            browser.bookmarks.create({ url, title, parentId: pathobj.id })
            return
        } // otherwise, give the user an error, probably with [v.path for v in validpaths]
    }

    browser.bookmarks.create({ url, title })
}

//#background
export async function echo(...str: string[]) {
    return str.join(" ")
}

/**
 * Lets you execute JavaScript in the page context. If you want to get the result back, use `composite js ... | fillcmdline`
 *
 * Some of Tridactyl's functions are accessible here via the `tri` object. Just do `console.log(tri)` in the web console on the new tab page to see what's available.
 *
 * If you want to pipe an argument to `js`, you need to use the "-p" flag and then use the JS_ARG global variable, e.g:
 *
 * `composite get_current_url | js -p alert(JS_ARG)`
 */
/* tslint:disable:no-identical-functions */
//#content
export async function js(...str: string[]) {
    if (str[0].startsWith("-p")) {
        /* tslint:disable:no-unused-declaration */
        /* tslint:disable:no-dead-store */
        const JS_ARG = str[str.length - 1]
        return eval(str.slice(1, -1).join(" "))
    } else {
        return eval(str.join(" "))
    }
}

/**
 * Lets you execute JavaScript in the background context. All the help from [[js]] applies. Gives you a different `tri` object.
 */
/* tslint:disable:no-identical-functions */
//#background
export async function jsb(...str: string[]) {
    if (str[0].startsWith("-p")) {
        /* tslint:disable:no-unused-declaration */
        /* tslint:disable:no-dead-store */
        const JS_ARG = str[str.length - 1]
        return eval(str.slice(1, -1).join(" "))
    } else {
        return eval(str.join(" "))
    }
}

/**
 * Opens a new tab the url of which is "https://github.com/tridactyl/tridactyl/issues/new" and automatically fill add tridactyl, firefox and os version to the issue.
 */
//#content
export async function issue() {
    const newIssueUrl = "https://github.com/tridactyl/tridactyl/issues/new"
    if (window.location.href !== newIssueUrl) {
        return excmd_open.tabopen(newIssueUrl)
    }
    const textarea = document.getElementById("issue_body")
    if (!(textarea instanceof HTMLTextAreaElement)) {
        logger.warning("issue(): Couldn't find textarea element in github issue page.")
        return
    }
    let template = await (fetch(browser.runtime.getURL("issue_template.md"))
        .then(resp => resp.body.getReader())
        .then(reader => reader.read())
        .then(r => (new TextDecoder("utf-8")).decode(r.value)))
    if (textarea.value !== template) {
        logger.debug("issue(): Textarea value differs from template, exiting early.")
        return
    }
    const platform = await browserBg.runtime.getPlatformInfo();
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
    const highestKnownVersion = await Updates.getLatestVersion(forceCheck)
    if (!highestKnownVersion) {
        return false
    }

    if (!Updates.shouldNagForVersion(highestKnownVersion)) {
        if (source == "manual") {
            excmd_fillcmdline.fillcmdline_tmp(30000, "You're up to date! Tridactyl version " + highestKnownVersion.version + ".")
        }
        return false
    }

    const notify = () => {
        excmd_fillcmdline.fillcmdline_tmp(30000, "Tridactyl " + highestKnownVersion.version + " is available (you're on " + Updates.getInstalledVersion() + "). Visit about:addons, right click Tridactyl, click 'Find Updates'. Restart Firefox once it has downloaded.")
    }

    // A bit verbose, but I figured it was important to have the logic
    // right when it comes to automatically nagging users about the
    // version they're on.
    if (source == "manual") {
        notify()
    } else if (source == "auto_impolite") {
        logger.debug("Impolitely nagging user to update. Installed, latest: ",
                     Updates.getInstalledVersion(), highestKnownVersion)
        notify()
        Updates.updateLatestNaggedVersion(highestKnownVersion)
    } else if (source == "auto_polite" && !Updates.naggedForVersion(highestKnownVersion)) {
        logger.debug("Politely nagging user to update. Installed, latest: ",
                     Updates.getInstalledVersion(), highestKnownVersion)
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
    else if ((details as any).temporary !== true && details.reason === "update") updatenative(false)
    // could add elif "update" and show a changelog. Hide it behind a setting to make it less annoying?
})

// vim: tabstop=4 shiftwidth=4 expandtab
