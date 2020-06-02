import { isTextEditable } from "@src/lib/dom"
import { contentState, ModeName } from "@src/content/state_content"
import Logger from "@src/lib/logging"
import * as controller from "@src/lib/controller"
import { KeyEventLike } from "@src/lib/keyseq"

import * as hinting from "@src/content/hinting"
import * as gobblemode from "@src/parsers/gobblemode"
import * as generic from "@src/parsers/genericmode"
import * as nmode from "@src/parsers/nmode"

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
class KeyCanceller {
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
        if (!ke.isTrusted) return
        this.cancelKey(ke, this.keyPress)
    }

    cancelKeyUp(ke: KeyboardEvent) {
        if (!ke.isTrusted) return
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
        if ((index >= 0) && (ke instanceof KeyboardEvent)) {
            ke.preventDefault()
            ke.stopImmediatePropagation()
            kes.splice(index, 1)
        }
    }
}

export const canceller = new KeyCanceller()

/** Accepts keyevents, resolves them to maps, maps to exstrs, executes exstrs */
function* ParserController() {
    const parsers: { [mode_name in ModeName]: any } = {
        normal: keys => generic.parser("nmaps", keys),
        insert: keys => generic.parser("imaps", keys),
        input: keys => generic.parser("inputmaps", keys),
        ignore: keys => generic.parser("ignoremaps", keys),
        hint: hinting.parser,
        gobble: gobblemode.parser,
        visual: keys => generic.parser("vmaps", keys),
        nmode: nmode.parser,
    }

    while (true) {
        let exstr = ""
        let previousSuffix = null
        let keyEvents: KeyEventLike[] = []
        try {
            while (true) {
                const keyevent: KeyEventLike = yield

                const shadowRoot =
                    keyevent instanceof KeyboardEvent
                        ? (keyevent.target as Element).shadowRoot
                        : null

                // _just to be safe_, cache this to make the following
                // code more thread-safe.
                const currentMode = contentState.mode
                const textEditable =
                    keyevent instanceof KeyboardEvent
                        ? shadowRoot === null
                            ? isTextEditable(keyevent.target as Element)
                            : isTextEditable(shadowRoot.activeElement)
                        : false

                // Don't break old modes with keyup events
                // TODO: fix this in these parsers directly
                if (["hint", "gobble"].includes(currentMode) && (keyevent as any).keyup) continue

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
                            contentState.mode = "insert"
                        }
                    } else if (currentMode === "insert") {
                        contentState.mode = "normal"
                    }
                } else if (currentMode === "input" && !textEditable) {
                    contentState.mode = "normal"
                }

                const newMode = contentState.mode
                if (newMode !== currentMode) {
                    keyEvents = []
                    previousSuffix = null
                }

                // Accumulate key events. The parser will cut this
                // down whenever it's not a valid prefix of a known
                // binding, so it can't grow indefinitely unless you
                // have a combination of maps that permits bindings of
                // unbounded length.
                keyEvents.push(keyevent)

                const response = (
                    parsers[contentState.mode] ||
                    (keys => generic.parser(contentState.mode + "maps", keys))
                )(keyEvents)
                logger.debug(
                    currentMode,
                    contentState.mode,
                    keyEvents,
                    response,
                )

                if ((response.isMatch) && (keyevent instanceof KeyboardEvent)) {
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
                    const suffix = keyEvents
                        .map(x => PrintableKey(x))
                        .join("")
                    if (previousSuffix !== suffix) {
                        contentState.suffix = suffix
                        previousSuffix = suffix
                    }
                    logger.debug("suffix: ", suffix)
                }
            }
            contentState.suffix = ""
            controller.acceptExCmd(exstr)
        } catch (e) {
            // Rumsfeldian errors are caught here
            logger.error("An error occurred in the content controller: ", e)
        }
    }
}

export const generator = ParserController() // var rather than let stops weirdness in repl.
generator.next()

/** Feed keys to the ParserController */
export function acceptKey(keyevent: KeyboardEvent) {
    return generator.next(keyevent)
}
