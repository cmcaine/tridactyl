import { wrap_input, getLineAndColNumber } from "@src/lib/editor_utils"
import Native from "@src/lib/generated/native"
import nativeedit from "@src/lib/generated/nativeedit"
import * as DOM from "@src/lib/dom"
import * as Logging from "@src/lib/logging"

const logger = new Logging.Logger("excmds")

export function getInput(e?: HTMLElement) {
    if (!e) {
        e = DOM.getLastUsedInput()
    }

    // this should probably be subsumed by the focusinput code
    if ("value" in e) {
        return (e as HTMLInputElement).value
    } else {
        return e.textContent
    }
}

export function getInputSelector() {
    return DOM.getSelector(DOM.getLastUsedInput())
}

export function addTridactylEditorClass(selector: string) {
    const elem = document.querySelector(selector)
    elem.className = elem.className + " TridactylEditing "
}

export function removeTridactylEditorClass(selector: string) {
    const elem = document.querySelector(selector)
    elem.className = elem.className.replace(" TridactylEditing ", "")
}

export async function editor() {
    const elem = DOM.getLastUsedInput()
    const selector = DOM.getSelector(elem)
    addTridactylEditorClass(selector)

    try {
        let text = ""
        let line = 0
        let col = 0
        wrap_input((t, start, end) => {
            [text, line, col] = getLineAndColNumber(t, start, end)
            return [null, null, null]
        })(elem)
        const file = (await Native.temp(text, document.location.hostname)).content
        const exec = await nativeedit.startNativeEdit(file, line, col)
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

export async function fillinput(selector: string, ...content: string[]) {
    let inputToFill = document.querySelector(selector)
    if (!inputToFill) inputToFill = DOM.getLastUsedInput()
    if ("value" in inputToFill) {
        (inputToFill as HTMLInputElement).value = content.join(" ")
    } else {
        inputToFill.textContent = content.join(" ")
    }
}
