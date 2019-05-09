import { isTextEditable } from "@src/lib/dom"
import { ModeName, State } from "@src/content/state_content"
import Logger from "@src/lib/logging"
import * as controller from "@src/lib/controller"

import * as hinting from "@src/content/hinting"
import * as gobblemode from "@src/parsers/gobblemode"
import * as generic from "@src/parsers/genericmode"

const logger = new Logger("controller")

function PrintableKey(k) {
    let result = k.key
    if (
        result === "Control" ||
        result === "Meta" ||
        result === "Alt" ||
        result === "Shift" ||
        result === "OS"
    ) {
        return ""
    }

    if (k.altKey) {
        result = "A-" + result
    }
    if (k.ctrlKey) {
        result = "C-" + result
    }
    if (k.shiftKey) {
        result = "S-" + result
    }
    if (result.length > 1) {
        result = "<" + result + ">"
    }
    return result
}

/**
 * KeyCanceller: keep track of keys that have been cancelled in the keydown
 * handler (which takes care of dispatching ex commands) and also cancel them
 * in keypress/keyup event handlers. This fixes
 * https://github.com/tridactyl/tridactyl/issues/234.
 *
 * If you make modifications to this class, keep in mind that keyup events
 * might not arrive in the same order as the keydown events (e.g. user presses
 * A, then B, releases B and then A).
 */
export class KeyCanceller {
    private keyPress: KeyboardEvent[] = []
    private keyUp: KeyboardEvent[] = []

    constructor() {
        this.cancelKeyUp = this.cancelKeyUp.bind(this)
        this.cancelKeyPress = this.cancelKeyPress.bind(this)
    }

    push(ke: KeyboardEvent) {
        this.keyPress.push(ke)
        this.keyUp.push(ke)
    }

    cancelKeyPress(ke: KeyboardEvent) {
        this.cancelKey(ke, this.keyPress)
    }

    cancelKeyUp(ke: KeyboardEvent) {
        this.cancelKey(ke, this.keyUp)
    }

    private cancelKey(ke: KeyboardEvent, kes: KeyboardEvent[]) {
        const index = kes.findIndex(
            ke2 =>
                ke.altKey === ke2.altKey &&
                ke.code === ke2.code &&
                ke.composed === ke2.composed &&
                ke.ctrlKey === ke2.ctrlKey &&
                ke.metaKey === ke2.metaKey &&
                ke.shiftKey === ke2.shiftKey &&
                ke.target === ke2.target,
        )
        if (index >= 0) {
            ke.preventDefault()
            ke.stopImmediatePropagation()
            kes.splice(index, 1)
        }
    }
}

/** Accepts keyevents, resolves them to maps, maps to exstrs, executes exstrs */
export function* Parser(state: State, canceller: KeyCanceller) {
    const parsers: { [mode_name in ModeName]: any } = {
        normal: keys => generic.parser("nmaps", keys),
        insert: keys => generic.parser("imaps", keys),
        input: keys => generic.parser("inputmaps", keys),
        ignore: keys => generic.parser("ignoremaps", keys),
        hint: hinting.parser,
        gobble: gobblemode.parser,
    }

    while (true) {
        let exstr = ""
        let keyEvents: KeyboardEvent[] = []
        try {
            while (true) {
                const keyevent: KeyboardEvent = yield

                // _just to be safe_, cache this to make the following
                // code more thread-safe.
                const currentMode = state.mode
                const textEditable = isTextEditable(keyevent.target as Element)

                // This code was sort of the cause of the most serious bug in Tridactyl
                // to date (March 2018).
                // https://github.com/tridactyl/tridactyl/issues/311
                if (
                    currentMode !== "ignore" &&
                    currentMode !== "hint" &&
                    currentMode !== "input"
                ) {
                    if (textEditable) {
                        if (currentMode !== "insert") {
                            state.mode = "insert"
                        }
                    } else if (currentMode === "insert") {
                        state.mode = "normal"
                    }
                } else if (currentMode === "input" && !textEditable) {
                    state.mode = "normal"
                }

                // Accumulate key events. The parser will cut this
                // down whenever it's not a valid prefix of a known
                // binding, so it can't grow indefinitely unless you
                // have a combination of maps that permits bindings of
                // unbounded length.
                keyEvents.push(keyevent)

                const response = parsers[state.mode](keyEvents)
                logger.debug(currentMode, state.mode, keyEvents, response)

                if (response.isMatch) {
                    keyevent.preventDefault()
                    keyevent.stopImmediatePropagation()
                    canceller.push(keyevent)
                }

                if (response.exstr) {
                    exstr = response.exstr
                    break
                } else {
                    keyEvents = response.keys
                    // show current keyEvents as a suffix of the contentState
                    state.suffix = keyEvents.map(x => PrintableKey(x)).join("")
                    logger.debug("suffix: ", state.suffix)
                }
            }
            controller.acceptExCmd(exstr)
            state.suffix = ""
        } catch (e) {
            // Rumsfeldian errors are caught here
            logger.error("An error occurred in the content controller: ", e)
        }
    }
}

export class Controller {
    accept_cb: (e: KeyboardEvent) => void
    canceller: KeyCanceller
    parser: Iterator<void>

    constructor(state: State) {
        this.canceller = new KeyCanceller()
        this.parser = Parser(state, this.canceller)
        // Advance the generator one for undocumented reasons
        this.parser.next()
        this.accept_cb = e => this.parser.next(e)
    }

    addKeyEventListenersTo(elem) {
        // First, remove all of our listeners in case we've been
        // called on the same element twice
        elem.removeEventListener("keydown", this.accept_cb, true)
        elem.removeEventListener(
            "keypress",
            this.canceller.cancelKeyPress,
            true,
        )
        elem.removeEventListener("keyup", this.canceller.cancelKeyUp, true)

        // Then add them all on.
        elem.addEventListener("keydown", this.accept_cb, true)
        elem.addEventListener("keypress", this.canceller.cancelKeyPress, true)
        elem.addEventListener("keyup", this.canceller.cancelKeyUp, true)
    }
}
