// We have a single dependency on config: getting the value of the WORDPATTERN setting
// Perhaps we could find a way to get rid of it?
import * as config from "@src/lib/config"

export type editor_function = (
    text: string,
    start: number,
    end: number,
    arg?: any,
) => [string, number, number]

/**
 * Applies a function to an element. If the element is an HTMLInputElement and its type isn't "text", it is first turned into a "text" element. This is necessary because some elements (e.g. "email") do not have a selectionStart/selectionEnd.
 * https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange .
 **/
export function applyToElem(e, fn) {
    let result
    if (e instanceof HTMLInputElement && e.type !== "text") {
        const t = e.type
        e.type = "text"
        result = fn(e)
        e.type = t
    } else {
        result = fn(e)
    }
    return result
}

/**
 * Returns values necessary for editor functions to work on textarea/input elements
 *
 * @param e the element
 * @return [string, number, number] The content of the element, the position of the caret, the position of the end of the visual selection
 */
export function getSimpleValues(e: any) {
    return applyToElem(e, e => [e.value, e.selectionStart, e.selectionEnd])
}

/**
 * Returns values necessary for editor functions to work on contentEditable elements
 *
 * @param e a contentEditable element
 * @return [string, number, number] The content of the element, the position of the caret, the position of the end of the visual selection
 */
export function getContentEditableValues(e: any): [string, number, number] {
    const selection = e.ownerDocument.getSelection()
    // The selection might actually not be in e so we need to make sure it is
    let n = selection.anchorNode
    while (n && n !== e) n = n.parentNode
    // The selection isn't for e, so we can't do anything
    if (!n) return [null, null, null]
    // selection might span multiple elements, might not start with the first element in e or end with the last element in e so the easiest way to compute caret position from beginning of e is to first compute distance from caret to end of e, then move beginning of selection to beginning of e and then use distance from end of selection to compute distance from beginning of selection
    const r = selection.getRangeAt(0).cloneRange()
    const selectionLength = r.toString().length
    r.setEnd(e, e.childNodes.length)
    const lengthFromCaretToEndOfText = r.toString().length
    r.setStart(e, 0)
    const s = r.toString()
    const caretPos = s.length - lengthFromCaretToEndOfText
    return [s, caretPos, caretPos + selectionLength]
}

/**
 * Change text in regular textarea/input fields. Note: this destroys the field's history (i.e. C-z won't work).
 *
 * @param e The element
 * @param text The new content of the element, null if it shouldn't change
 * @param start The new position of the caret, null if the caret shouldn't move
 * @param end The end of the visual selection, null if you just want to move the caret
 */
export function setSimpleValues(e, text, start, end) {
    return applyToElem(e, e => {
        if (text !== null) e.value = text
        if (start !== null) {
            if (end === null) end = start
            e.selectionStart = start
            e.selectionEnd = end
        }
    })
}

/**
 * Change text in contentEditable elements in a non-destructive way (i.e. C-z will undo changes).
 * @param e The content editable element
 * @param text The new content the element should have. null if you just want to move the caret around
 * @param start The new caret position. null if you just want to change text.
 * @param end The end of the visual selection. null if you just want to move the caret.
 */
export function setContentEditableValues(e, text, start, end) {
    const selection = e.ownerDocument.getSelection()
    if (selection.rangeCount < 1) {
        const r = new Range()
        r.setStart(e, 0)
        r.setEnd(e, e.childNodes.length)
        selection.addRange(r)
    }
    if (text !== null) {
        const range = selection.getRangeAt(0)
        const anchorNode = selection.anchorNode
        const focusNode = selection.focusNode
        range.setStart(anchorNode, 0)
        range.setEndAfter(focusNode, focusNode.length)
        e.ownerDocument.execCommand("insertText", false, text)
    }
    if (start !== null) {
        if (end === null) end = start
        let range = selection.getRangeAt(0)
        range.setStart(range.startContainer, start)
        range = selection.getRangeAt(0)
        range.setEnd(range.startContainer, end)
    }
}

/**
 * Take an editor function as parameter and return it wrapped in a function that will handle grabbing text and caret position from the HTML element it takes as parameter
 *
 * @param editor_function A function that takes a [string, selectionStart, selectionEnd] tuple as argument and returns a [string, selectionStart, selectionEnd] tuple corresponding to the new state of the text.
 *
 * @return boolean Whether the editor function was actually called or not
 *
 **/
export function wrap_input(
    fn: editor_function,
): (e: HTMLElement, arg?: any) => boolean {
    return (e: HTMLElement, arg?: any) => {
        let getValues = getSimpleValues
        let setValues = setSimpleValues
        if (e.isContentEditable) {
            getValues = getContentEditableValues
            setValues = setContentEditableValues
        }
        const [origText, origStart, origEnd] = getValues(e)
        if (origText === null || origStart === null) return false
        setValues(e, ...fn(origText, origStart, origEnd, arg))
        return true
    }
}

/**
 * Take an editor function as parameter and wrap it in a function that will handle error conditions
 */
export function needs_text(fn: editor_function, arg?: any): editor_function {
    return (
        text: string,
        selectionStart: number,
        selectionEnd: number,
        arg?: any,
    ) => {
        if (
            text.length === 0 ||
            selectionStart === null ||
            selectionStart === undefined
        )
            return [null, null, null]
        return fn(
            text,
            selectionStart,
            typeof selectionEnd === "number" ? selectionEnd : selectionStart,
            arg,
        )
    }
}

/**
 * Returns line and column number.
 */
export function getLineAndColNumber(text: string, start: number, end: number): [string, number, number] {
    const lines = text.split("\n")
    let totalChars = 0
    for (let i = 0; i < lines.length; ++i) {
        // +1 because we also need to take '\n' into account
        if (totalChars + lines[i].length + 1 > start) {
            return [text, i + 1, start - totalChars]
        }
        totalChars += lines[i].length + 1
    }
    return [text, lines.length, 1]
}

/**
 * Detects the boundaries of a word in text according to the wordpattern setting. If POSITION is in a word, the boundaries of this word are returned. If POSITION is out of a word and BEFORE is true, the word before POSITION is returned. If BEFORE is false, the word after the caret is returned.
 */
export function getWordBoundaries(
    text: string,
    position: number,
    before: boolean,
): [number, number] {
    if (position < 0 || position > text.length)
        throw new Error(
            `getWordBoundaries: position (${position}) should be within text ("${text}") boundaries (0, ${
                text.length
            })`,
        )
    const pattern = new RegExp(config.get("wordpattern"), "g")
    let boundary1 = position < text.length ? position : text.length - 1
    const direction = before ? -1 : 1
    // if the caret is not in a word, try to find the word before or after it
    while (
        boundary1 >= 0 &&
        boundary1 < text.length &&
        !text[boundary1].match(pattern)
    ) {
        boundary1 += direction
    }

    if (boundary1 < 0) boundary1 = 0
    else if (boundary1 >= text.length) boundary1 = text.length - 1

    // if a word couldn't be found in this direction, try the other one
    while (
        boundary1 >= 0 &&
        boundary1 < text.length &&
        !text[boundary1].match(pattern)
    ) {
        boundary1 -= direction
    }

    if (boundary1 < 0) boundary1 = 0
    else if (boundary1 >= text.length) boundary1 = text.length - 1

    if (!text[boundary1].match(pattern)) {
        // there is no word in text
        throw new Error(
            `getWordBoundaries: no characters matching wordpattern (${
                pattern.source
            }) in text (${text})`,
        )
    }

    // now that we know the caret is in a word (it could be in the middle depending on POSITION!), try to find its beginning/end
    while (
        boundary1 >= 0 &&
        boundary1 < text.length &&
        !!text[boundary1].match(pattern)
    ) {
        boundary1 += direction
    }
    // boundary1 is now outside of the word, bring it back inside of it
    boundary1 -= direction

    let boundary2 = boundary1
    // now that we know the caret is at the beginning/end of a word, we need to find the other boundary
    while (
        boundary2 >= 0 &&
        boundary2 < text.length &&
        !!text[boundary2].match(pattern)
    ) {
        boundary2 -= direction
    }
    // boundary2 is outside of the word, bring it back in
    boundary2 += direction

    // Add 1 to the end boundary because the end of a word is marked by the character after said word
    if (boundary1 > boundary2) return [boundary2, boundary1 + 1]
    return [boundary1, boundary2 + 1]
}

/**
 * Finds the next word as defined by the wordpattern setting after POSITION. If POSITION is in a word, POSITION is moved forward until it is out of the word.
 * @return number The position of the next word in text or -1 if the next word can't be found.
 */
export function wordAfterPos(text: string, position: number) {
    if (position < 0)
        throw new Error(`wordAfterPos: position (${position}) is less that 0`)
    const pattern = new RegExp(config.get("wordpattern"), "g")
    // move position out of the current word
    while (position < text.length && !!text[position].match(pattern))
        position += 1
    // try to find characters that match wordpattern
    while (position < text.length && !text[position].match(pattern))
        position += 1
    if (position >= text.length) return -1
    return position
}
