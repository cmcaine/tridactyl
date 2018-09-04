import { MsgSafeKeyboardEvent, MsgSafeNode } from "./msgsafe"
import { isTextEditable } from "./dom"
import { isSimpleKey } from "./keyseq"
import state from "./state"
import { repeat } from "./.excmds_background.generated"
import Logger from "./logging"

import { parser as exmode_parser } from "./parsers/exmode"
import { parser as hintmode_parser } from "./hinting_background"
import { parser as findmode_parser } from "./finding_background"
import * as gobblemode from "./parsers/gobblemode"
import * as generic from "./parsers/genericmode"

const logger = new Logger("controller")

/** Accepts keyevents, resolves them to maps, maps to exstrs, executes exstrs */
function* ParserController() {
    const parsers = {
        normal: keys => generic.parser("nmaps", keys),
        insert: keys => generic.parser("imaps", keys),
        input: keys => generic.parser("inputmaps", keys),
        ignore: keys => generic.parser("ignoremaps", keys),
        hint: hintmode_parser,
        find: findmode_parser,
        gobble: gobblemode.parser,
    }

    while (true) {
        let exstr = ""
        let keyEvents = []
        try {
            while (true) {
                let keyevent: MsgSafeKeyboardEvent = yield

                // This code was sort of the cause of the most serious bug in Tridactyl
                // to date (March 2018).
                // https://github.com/cmcaine/tridactyl/issues/311
                if (
                    state.mode != "ignore" &&
                    state.mode != "hint" &&
                    state.mode != "input" &&
                    state.mode != "find"
                ) {
                    if (isTextEditable(keyevent.target)) {
                        if (state.mode !== "insert") {
                            state.mode = "insert"
                        }
                    } else if (state.mode === "insert") {
                        state.mode = "normal"
                    }
                } else if (
                    state.mode === "input" &&
                    !isTextEditable(keyevent.target)
                ) {
                    state.mode = "normal"
                }
                logger.debug(keyevent, state.mode)

                keyEvents.push(keyevent)
                let response = undefined
                response = (parsers[state.mode] as any)(keyEvents)
                logger.debug(keyEvents, response)

                if (response.exstr) {
                    exstr = response.exstr
                    break
                } else {
                    keyEvents = response.keys
                }
            }
            acceptExCmd(exstr)
        } catch (e) {
            // Rumsfeldian errors are caught here
            logger.error(
                "An error occurred in the controller: ",
                e,
                " ¯\\_(ツ)_/¯",
            )
        }
    }
}

let generator = ParserController() // var rather than let stops weirdness in repl.
generator.next()

/** Feed keys to the ParserController */
export function acceptKey(keyevent: MsgSafeKeyboardEvent) {
    generator.next(keyevent)
}

export let last_ex_str = ""

/** Parse and execute ExCmds */
export async function acceptExCmd(exstr: string): Promise<any> {
    // TODO: Errors should go to CommandLine.
    try {
        let [func, args] = exmode_parser(exstr)
        // Stop the repeat excmd from recursing.
        if (func !== repeat) last_ex_str = exstr
        try {
            return await func(...args)
        } catch (e) {
            // Errors from func are caught here (e.g. no next tab)
            logger.error(e)
        }
    } catch (e) {
        // Errors from parser caught here
        logger.error(e)
    }
}

import { activeTabId } from "./lib/webext"
if (browser.webNavigation) {
    browser.webNavigation.onBeforeNavigate.addListener(async function(details) {
        if (details.frameId === 0 && details.tabId === (await activeTabId())) {
            state.mode = "normal"
        }
    })
}
browser.tabs.onActivated.addListener(() => (state.mode = "normal"))
