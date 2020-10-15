/** # Command line functions
 *
 * This file contains functions to interact with the command line.
 *
 * If you want to bind them to keyboard shortcuts, be sure to prefix them with "ex.". For example, if you want to bind control-p to `prev_completion`, use:
 *
 * ```
 * bind --mode=ex <C-p> ex.prev_completion
 * ```
 *
 * Note that you can also bind Tridactyl's [editor functions](/static/docs/modules/_src_lib_editor_.html) in the command line.
 *
 * Contrary to the main tridactyl help page, this one doesn't tell you whether a specific function is bound to something. For now, you'll have to make do with `:bind` and `:viewconfig`.
 *
 */
/** ignore this line */

/** Script used in the commandline iframe. Communicates with background. */

import * as perf from "@src/perf"
import "@src/lib/number.clamp"
import "@src/lib/html-tagged-template"
import { TabAllCompletionSource } from "@src/completions/TabAll"
import { BindingsCompletionSource } from "@src/completions/Bindings"
import { BufferCompletionSource } from "@src/completions/Tab"
import { BmarkCompletionSource } from "@src/completions/Bmark"
import { ExcmdCompletionSource } from "@src/completions/Excmd"
import { CompositeCompletionSource } from "@src/completions/Composite"
import { FileSystemCompletionSource } from "@src/completions/FileSystem"
import { GuisetCompletionSource } from "@src/completions/Guiset"
import { HelpCompletionSource } from "@src/completions/Help"
import { AproposCompletionSource } from "@src/completions/Apropos"
import { HistoryCompletionSource } from "@src/completions/History"
import { PreferenceCompletionSource } from "@src/completions/Preferences"
import { RssCompletionSource } from "@src/completions/Rss"
import { SessionsCompletionSource } from "@src/completions/Sessions"
import { SettingsCompletionSource } from "@src/completions/Settings"
import { WindowCompletionSource } from "@src/completions/Window"
import { ExtensionsCompletionSource } from "@src/completions/Extensions"
import * as Messaging from "@src/lib/messaging"
import "@src/lib/number.clamp"
import state from "@src/state"
import * as State from "@src/state"
import Logger from "@src/lib/logging"
import { theme } from "@src/content/styling"

import * as genericParser from "@src/parsers/genericmode"
import * as tri_editor from "@src/lib/editor"

/** @hidden **/
const logger = new Logger("cmdline")

/** @hidden **/
const commandline_state = {
    activeCompletions: undefined,
    clInput: window.document.getElementById(
        "tridactyl-input",
    ) as HTMLInputElement,
    clear,
    cmdline_history_position: 0,
    completionsDiv: window.document.getElementById("completions"),
    fns: undefined,
    getCompletion,
    history,
    /** @hidden
     * This is to handle Escape key which, while the cmdline is focused,
     * ends up firing both keydown and input listeners. In the worst case
     * hides the cmdline, shows and refocuses it and replaces its text
     * which could be the prefix to generate a completion.
     * tl;dr TODO: delete this and better resolve race condition
     */
    isVisible: false,
    keyEvents: new Array<KeyEventLike>(),
    refresh_completions,
    state,
}

// first theming of commandline iframe
theme(document.querySelector(":root"))

/** @hidden **/
function resizeArea() {
    if (commandline_state.isVisible) {
        Messaging.messageOwnTab("commandline_content", "show")
        Messaging.messageOwnTab("commandline_content", "focus")
        focus()
    }
}

/** @hidden
 * This is a bit loosely defined at the moment.
 * Should work so long as there's only one completion source per prefix.
 */
function getCompletion(args_only = false) {
    if (!commandline_state.activeCompletions) return undefined

    for (const comp of commandline_state.activeCompletions) {
        if (comp.state === "normal" && comp.completion !== undefined) {
            return args_only ? comp.args : comp.completion
        }
    }
}
commandline_state.getCompletion = getCompletion

/** @hidden **/
export function enableCompletions() {
    if (!commandline_state.activeCompletions) {
        commandline_state.activeCompletions = [
            // FindCompletionSource,
            BindingsCompletionSource,
            BmarkCompletionSource,
            TabAllCompletionSource,
            BufferCompletionSource,
            ExcmdCompletionSource,
            CompositeCompletionSource,
            FileSystemCompletionSource,
            GuisetCompletionSource,
            HelpCompletionSource,
            AproposCompletionSource,
            HistoryCompletionSource,
            PreferenceCompletionSource,
            RssCompletionSource,
            SessionsCompletionSource,
            SettingsCompletionSource,
            TabGroupCompletionSource,
            WindowCompletionSource,
            ExtensionsCompletionSource,
        ]
            .map(constructorr => {
                try {
                    return new constructorr(commandline_state.completionsDiv)
                } catch (e) {}
            })
            .filter(c => c)

        const fragment = document.createDocumentFragment()
        commandline_state.activeCompletions.forEach(comp =>
            fragment.appendChild(comp.node),
        )
        commandline_state.completionsDiv.appendChild(fragment)
        logger.debug(commandline_state.activeCompletions)
    }
}
/* document.addEventListener("DOMContentLoaded", enableCompletions) */

/** @hidden **/
const noblur = e => setTimeout(() => commandline_state.clInput.focus(), 0)

/** @hidden **/
export function focus() {
    commandline_state.clInput.focus()
    commandline_state.clInput.removeEventListener("blur", noblur)
    commandline_state.clInput.addEventListener("blur", noblur)
}

/** @hidden **/
let HISTORY_SEARCH_STRING: string

/** @hidden
 * Command line keybindings
 **/
const keyParser = keys => genericParser.parser("exmaps", keys)
/** @hidden **/
let history_called = false
/** @hidden **/
let prev_cmd_called_history = false
/** @hidden **/
commandline_state.clInput.addEventListener(
    "keydown",
    function (keyevent: KeyboardEvent) {
        if (!keyevent.isTrusted) return
        commandline_state.keyEvents.push(keyevent)
        const response = keyParser(commandline_state.keyEvents)
        if (response.isMatch) {
            keyevent.preventDefault()
            keyevent.stopImmediatePropagation()
        } else {
            // Ideally, all keys that aren't explicitly bound to an ex command
            // should be bound to a "self-insert" command that would input the
            // key itself. Because it's not possible to generate events as if
            // they originated from the user, we can't do this, but we still
            // need to simulate it, in order to have history() work.
            prev_cmd_called_history = false
        }
        if (response.value) {
            commandline_state.keyEvents = []
            history_called = false

            // If excmds start with 'ex.' they're coming back to us anyway, so skip that.
            // This is definitely a hack. Should expand aliases with exmode, etc.
            // but this whole thing should be scrapped soon, so whatever.
            if (response.value.startsWith("ex.")) {
                const [funcname, ...args] = response.value.slice(3).split(/\s+/)

                if (args.length === 0) {
                    commandline_state.fns[funcname]()
                } else {
                    commandline_state.fns[funcname](args.join(" "))
                }

                prev_cmd_called_history = history_called
            } else {
                // Send excmds directly to our own tab, which fixes the
                // old bug where a command would be issued in one tab but
                // land in another because the active tab had
                // changed. Background-mode excmds will be received by the
                // own tab's content script and then bounced through a
                // shim to the background, but the latency increase should
                // be acceptable becuase the background-mode excmds tend
                // to be a touch less latency-sensitive.
                Messaging.messageOwnTab("controller_content", "acceptExCmd", [
                    response.value,
                ]).then(_ => (prev_cmd_called_history = history_called))
            }
        } else {
            commandline_state.keyEvents = response.keys
        }
    },
    true,
)

export function refresh_completions(exstr) {
    if (!commandline_state.activeCompletions) enableCompletions()
    return Promise.all(
        commandline_state.activeCompletions.map(comp =>
            comp.filter(exstr).then(() => {
                if (comp.shouldRefresh()) {
                    return resizeArea()
                }
            }),
        ),
    ).catch(err => {
        console.error(err)
        return []
    }) // We can't use the regular logging mechanism because the user is using the command line.
}

/** @hidden **/
let onInputPromise: Promise<any> = Promise.resolve()
/** @hidden **/
commandline_state.clInput.addEventListener("input", () => {
    const exstr = commandline_state.clInput.value
    // Schedule completion computation. We do not start computing immediately because this would incur a slow down on quickly repeated input events (e.g. maintaining <Backspace> pressed)
    setTimeout(async () => {
        // Make sure the previous computation has ended
        await onInputPromise
        // If we're not the current completion computation anymore, stop
        if (exstr !== commandline_state.clInput.value) return

        onInputPromise = refresh_completions(exstr)
    }, 100)
})

/** @hidden **/
let cmdline_history_current = ""

/** @hidden
 * Clears the command line.
 * If you intend to close the command line after this, set evlistener to true in order to enable losing focus.
 *  Otherwise, no need to pass an argument.
 */
export function clear(evlistener = false) {
    if (evlistener)
        commandline_state.clInput.removeEventListener("blur", noblur)
    commandline_state.clInput.value = ""
    commandline_state.cmdline_history_position = 0
    cmdline_history_current = ""
}
commandline_state.clear = clear

/** @hidden **/
async function history(n) {
    history_called = true

    if (!prev_cmd_called_history) {
        HISTORY_SEARCH_STRING = commandline_state.clInput.value
    }

    const matches = (await State.getAsync("cmdHistory")).filter(key =>
        key.startsWith(HISTORY_SEARCH_STRING),
    )
    if (commandline_state.cmdline_history_position === 0) {
        cmdline_history_current = commandline_state.clInput.value
    }
    let clamped_ind =
        matches.length + n - commandline_state.cmdline_history_position
    clamped_ind = clamped_ind.clamp(0, matches.length)

    const pot_history = matches[clamped_ind]
    commandline_state.clInput.value =
        pot_history === undefined ? cmdline_history_current : pot_history

    // if there was no clampage, update history position
    // there's a more sensible way of doing this but that would require more programmer time
    if (
        clamped_ind ===
        matches.length + n - commandline_state.cmdline_history_position
    )
        commandline_state.cmdline_history_position =
            commandline_state.cmdline_history_position - n
}
commandline_state.history = history

/** @hidden **/
export function fillcmdline(
    newcommand?: string,
    trailspace = true,
    ffocus = true,
) {
    if (trailspace) commandline_state.clInput.value = newcommand + " "
    else commandline_state.clInput.value = newcommand
    commandline_state.isVisible = true
    let result = Promise.resolve([])
    // Focus is lost for some reason.
    if (ffocus) {
        focus()
        result = refresh_completions(commandline_state.clInput.value)
    }
    return result
}

/** @hidden
 * Create a temporary textarea and give it to fn. Remove the textarea afterwards
 *
 * Useful for document.execCommand
 **/
function applyWithTmpTextArea(fn) {
    let textarea
    try {
        textarea = document.createElement("textarea")
        // Scratchpad must be `display`ed, but can be tiny and invisible.
        // Being tiny and invisible means it won't make the parent page move.
        textarea.style.cssText =
            "visible: invisible; width: 0; height: 0; position: fixed"
        textarea.contentEditable = "true"
        document.documentElement.appendChild(textarea)
        return fn(textarea)
    } finally {
        document.documentElement.removeChild(textarea)
    }
}

/** @hidden **/
export async function setClipboard(content: string) {
    await Messaging.messageOwnTab("commandline_content", "focus")
    applyWithTmpTextArea(scratchpad => {
        scratchpad.value = content
        scratchpad.select()
        // This can return false spuriously so just ignore its return value
        document.execCommand("Copy")
        logger.info("set clipboard:", scratchpad.value)
    })
    // Return focus to the document
    await Messaging.messageOwnTab("commandline_content", "hide")
    return Messaging.messageOwnTab("commandline_content", "blur")
}

/** @hidden **/
export async function getClipboard() {
    await Messaging.messageOwnTab("commandline_content", "focus")
    const result = applyWithTmpTextArea(scratchpad => {
        scratchpad.focus()
        document.execCommand("Paste")
        return scratchpad.textContent
    })
    // Return focus to the document
    await Messaging.messageOwnTab("commandline_content", "hide")
    await Messaging.messageOwnTab("commandline_content", "blur")
    return result
}

/** @hidden **/
export function getContent() {
    return commandline_state.clInput.value
}

/** @hidden **/
export function editor_function(fn_name, ...args) {
    let result = Promise.resolve([])
    if (tri_editor[fn_name]) {
        tri_editor[fn_name](commandline_state.clInput, ...args)
        result = refresh_completions(commandline_state.clInput.value)
    } else {
        // The user is using the command line so we can't log message there
        // logger.error(`No editor function named ${fn_name}!`)
        console.error(`No editor function named ${fn_name}!`)
    }
    return result
}

import * as SELF from "@src/commandline_frame"
Messaging.addListener("commandline_frame", Messaging.attributeCaller(SELF))

import { getCommandlineFns } from "@src/lib/commandline_cmds"
import { KeyEventLike } from "./lib/keyseq"
import { TabGroupCompletionSource } from "./completions/TabGroup"
commandline_state.fns = getCommandlineFns(commandline_state)
Messaging.addListener(
    "commandline_cmd",
    Messaging.attributeCaller(commandline_state.fns),
)

// Listen for statistics from the commandline iframe and send them to
// the background for collection. Attach the observer to the window
// object since there's apparently a bug that causes performance
// observers to be GC'd even if they're still the target of a
// callback.
;(window as any).tri = Object.assign(window.tri || {}, {
    perfObserver: perf.listenForCounters(),
})
