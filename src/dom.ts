import { MsgSafeNode } from "./msgsafe"
import * as config from "./config"
import { flatten } from "./itertools"
import state from "./state"
import { activeTabId } from "./lib/webext"
import * as Logging from "./logging"
const logger = new Logging.Logger("dom")

// From saka-key lib/dom.js, under Apachev2

/**
 * Given a DOM element, returns true if you can edit it with key presses or
 * if the element is of a type that should handle its own keypresses
 * (e.g. role=application for google docs/sheets)
 * TODO: work on case sensitivity
 * consider all the possible cases
 * @param {HTMLElement} element
 * @returns {boolean}
 */
export function isTextEditable(element: MsgSafeNode) {
    if (element) {
        // HTML is always upper case, but XHTML is not necessarily upper case
        switch (element.nodeName.toUpperCase()) {
            case "INPUT":
                return isEditableHTMLInput(element)
            case "SELECT":
            case "TEXTAREA":
            case "OBJECT":
                return true
        }
        switch (true) {
            case element.contentEditable === undefined:
                // This happens on e.g. svgs.
                return false
            case element.contentEditable.toUpperCase() === "TRUE":
            case element.role === "application":
                return true
        }
    }
    return false
}

/**
 * Returns whether the passed HTML input element is editable
 * @param {HTMLInputElement} element
 */
function isEditableHTMLInput(element: MsgSafeNode) {
    if (element.disabled || element.readonly) return false
    switch (element.type) {
        case undefined:
        case "text":
        case "search":
        case "email":
        case "url":
        case "number":
        case "password":
        case "date":
        case "tel":
            return true
    }
    return false
}

/**
 * Dispatch a mouse event to the target element
 * based on cVim's implementation
 * @param {HTMLElement} element
 * @param {'hover' | 'unhover' | 'click'} type
 * @param {{ ctrlKey, shiftKey, altKey, metaKey }} modifierKeys
 */
export function mouseEvent(
    element: Element,
    type: "hover" | "unhover" | "click",
    modifierKeys = {},
) {
    let events = []
    switch (type) {
        case "unhover":
            events = ["mousemove", "mouseout", "mouseleave"]
            break
        case "click":
            events = ["mousedown", "mouseup", "click"]
        case "hover":
            events = ["mouseover", "mouseenter", "mousemove"].concat(events)
            break
    }
    events.forEach(type => {
        const event = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            detail: 1, // usually the click count
            ...modifierKeys,
        })
        element.dispatchEvent(event)
    })
}

/** Iterable of elements that match xpath.

    Adapted from stackoverflow
 */
export function* elementsByXPath(xpath, parent?) {
    let query = document.evaluate(
        xpath,
        parent || document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null,
    )
    for (let i = 0, length = query.snapshotLength; i < length; ++i) {
        yield query.snapshotItem(i)
    }
}

/** Type for functions that can filter element arrays */
interface ElementFilter {
    (element: Element): boolean
}

/** Is the element of "substantial" size and shown on the page. The element
 * doesn't need to be in the viewport. This is useful when you want to
 * scroll to something, but still want to exclude tiny and useless items
 */
export function isSubstantial(element: Element) {
    const clientRect = element.getClientRects()[0]
    const computedStyle = getComputedStyle(element)
    // remove elements that are barely within the viewport, tiny, or invisible
    switch (true) {
        case !clientRect:
        case clientRect.width < 3:
        case clientRect.height < 3:
        case computedStyle.visibility !== "visible":
        case computedStyle.display === "none":
            return false
    }
    return true
}

/** This function decides whether the height attribute contained in a
   ComputedStyle matters.  For example, the height attribute doesn't matter for
   elements that have "display: inline" because their height is overriden by
   the height of the node they are in. */
export function heightMatters(style: CSSStyleDeclaration) {
    switch (style.display) {
        case "inline":
        case "table-column":
        case "table-column-group":
            /* These two depend on other factors such as the element's type (span,
         div...) or its parent's style. If the previous cases aren't enough to
         decide whether the width attribute of the element matters, we should
         maybe try to test for them.
      case "initial":
      case "inherit":*/
            return false
    }
    return true
}

/* See [[heightMatters]] */
export function widthMatters(style: CSSStyleDeclaration) {
    switch (style.display) {
        case "inline":
        case "table-column":
        case "table-column-group":
        case "table-header-group":
        case "table-footer-group":
        case "table-row-group":
        case "table-cell":
        case "table-row":
            /* Take a look at [[heightMatters]] in order to understand why these two
         cases are commented
      case "initial":
      case "inherit?:*/
            return false
    }
    return true
}

// Saka-key caches getComputedStyle. Maybe it's a good idea!
/* let cgetComputedStyle = cacheDecorator(getComputedStyle) */

/** is the element within a rect and not obscured by another element?

    From: https://github.com/lusakasa/saka-key/blob/9f560b3a718a9efda809dcb794de14b4e675b35a/src/modes/hints/client/findHints.js#L97
    Based on https://github.com/guyht/vimari/blob/master/vimari.safariextension/linkHints.js

 */
export function isVisible(element: Element) {
    const clientRect = element.getClientRects()[0]
    const computedStyle = getComputedStyle(element)
    // remove elements that are barely within the viewport, tiny, or invisible
    switch (true) {
        case !clientRect:
        case clientRect.top < 0:
        case clientRect.top >= innerHeight - 4:
        case clientRect.left < 0:
        case clientRect.left >= innerWidth - 4:
        case widthMatters(computedStyle) && clientRect.width < 3:
        case heightMatters(computedStyle) && clientRect.height < 3:
        case computedStyle.visibility !== "visible":
        case computedStyle.display === "none":
            return false
    }
    return true

    /* // Eliminate elements hidden by another overlapping element. */
    /* // To do that, get topmost element at some offset from upper-left corner of clientRect */
    /* // and check whether it is the element itself or one of its descendants. */
    /* // The offset is needed to account for coordinates truncation and elements with rounded borders. */
    /* // */
    /* // Coordinates truncation occcurs when using zoom. In that case, clientRect coords should be float, */
    /* // but we get integers instead. That makes so that elementFromPoint(clientRect.left, clientRect.top) */
    /* // sometimes returns an element different from the one clientRect was obtained from. */
    /* // So we introduce an offset to make sure elementFromPoint hits the right element. */
    /* // */
    /* // For elements with a rounded topleft border, the upper left corner lies outside the element. */
    /* // Then, we need an offset to get to the point nearest to the upper left corner, but within border. */
    /* const coordTruncationOffset = 2 // A value of 1 has been observed not to be enough, */
    /* // so we heuristically choose 2, which seems to work well. */
    /* // We know a value of 2 is still safe (lies within the element) because, */
    /* // from the code above, widht & height are >= 3. */
    /* const radius = parseFloat(computedStyle.borderTopLeftRadius) */
    /* const roundedBorderOffset = Math.ceil(radius * (1 - Math.sin(Math.PI / 4))) */
    /* const offset = Math.max(coordTruncationOffset, roundedBorderOffset) */
    /* if (offset >= clientRect.width || offset >= clientRect.height) { */
    /*     return false */
    /* } */
    /* let el: Node = document.elementFromPoint( */
    /*     clientRect.left + offset, */
    /*     clientRect.top + offset */
    /* ) */
    /* while (el && el !== element) { */
    /*     el = el.parentNode */
    /* } */
    /* if (!el) { */
    /*     return false */
    /* } */
    /* return true */
}

/** Return all frames that belong to the document (frames that belong to
 * extensions are ignored).
 *
 * @param doc   The document the frames should be fetched from
 */
export function getAllDocumentFrames(doc = document) {
    if (!(doc instanceof HTMLDocument)) return []
    let frames = (<HTMLIFrameElement[] & HTMLFrameElement[]>Array.from(
        doc.getElementsByTagName("iframe"),
    ))
        .concat(Array.from(doc.getElementsByTagName("frame")))
        .filter(frame => !frame.src.startsWith("moz-extension://"))
    return frames.concat(
        frames.reduce((acc, f) => {
            // Errors could be thrown because of CSP
            let newFrames = []
            try {
                let doc = f.contentDocument || f.contentWindow.document
                newFrames = getAllDocumentFrames(doc)
            } catch (e) {}
            return acc.concat(newFrames)
        }, []),
    )
}

/** Computes the unique CSS selector of a specific HTMLElement */
export function getSelector(e: HTMLElement) {
    function uniqueSelector(e: HTMLElement) {
        // Only matching alphanumeric selectors because others chars might have special meaning in CSS
        if (e.id && e.id.match("^[a-zA-Z0-9]+$")) return "#" + e.id
        // If we reached the top of the document
        if (!e.parentElement) return "HTML"
        // Compute the position of the element
        let index =
            Array.from(e.parentElement.children)
                .filter(child => child.tagName == e.tagName)
                .indexOf(e) + 1
        return (
            uniqueSelector(e.parentElement) +
            ` > ${e.tagName}:nth-of-type(${index})`
        )
    }
    return uniqueSelector(e)
}

/** Get all elements that match the given selector
 *
 * @param selector   `the CSS selector to choose elements with
 * @param filters     filter to use (in thre given order) to further chose
 *                    items, or [] for all
 */
export function getElemsBySelector(
    selector: string,
    filters: Array<ElementFilter>,
) {
    let elems = Array.from(document.querySelectorAll(selector))
    let frameElems = getAllDocumentFrames().reduce((acc, frame) => {
        let newElems = []
        // Errors could be thrown by CSP
        try {
            let doc = frame.contentDocument || frame.contentWindow.document
            newElems = Array.from(doc.querySelectorAll(selector))
        } catch (e) {}
        return acc.concat(newElems)
    }, [])

    elems = elems.concat(frameElems)

    for (let filter of filters) {
        elems = elems.filter(filter)
    }

    return elems
}

/** Get the nth input element on a page
 *
 * @param nth         the element index, can be negative to start at the end
 * @param filters     filter to use (in thre given order) to further chose
 *                    items, or [] for all
 */
export function getNthElement(
    selectors: string,
    nth: number,
    filters: Array<ElementFilter>,
): HTMLElement {
    let inputs = getElemsBySelector(selectors, filters)

    if (inputs.length) {
        let index = Number(nth)
            .clamp(-inputs.length, inputs.length - 1)
            .mod(inputs.length)

        return <HTMLElement>inputs[index]
    }

    return null
}

/** Comparison function by offsetWidth/Height, used for sorting elements by their
 *  area on the page
 */
export function compareElementArea(a: HTMLElement, b: HTMLElement): number {
    const aArea = a.offsetWidth * a.offsetHeight
    const bArea = b.offsetWidth * b.offsetHeight

    return aArea - bArea
}

export const hintworthy_js_elems = []

/** Adds or removes an element from the hintworthy_js_elems array of the
 *  current tab.
 *
 *  @param {EventTarget} elem  The element add/removeEventListener is called on
 *  @param {boolean} add       true when called from addEventListener,
 *                             false from removeEventListener
 *  @param {string} event      The event name given to add/removeEventListener
 *
 *  This function must be security reviewed when Custom Elements land in Firefox
 *  https://bugzilla.mozilla.org/show_bug.cgi?id=1406825
 *
 *  This function is exported to the web content window but should only be
 *  callable from our modified add/removeEventListener because we remove the
 *  reference to it before web content runs (if added afterwards a
 *  mutationobserver on the window object would probably capture a reference to
 *  this function).
 *
 *  Just in case web content does get a direct reference or the built-in
 *  add/removeEventListener code doesn't validate elem correctly, this function
 *  must assume that its inputs are potentially malicious.
 */
export function registerEvListenerAction(
    elem: EventTarget,
    add: boolean,
    event: string,
) {
    // We're only interested in the subset of EventTargets that are Elements.
    if (!(elem instanceof Element)) {
        return
    }

    // Prevent bad elements from being processed
    //
    // This is defence in depth: we should never receive an invalid elem here
    // because add/removeEventListener currently throws a TypeError if the given
    // element is not a standard library EventTarget subclass.
    try {
        // Node prototype functions work on the C++ representation of the
        // Node, which a faked JS object won't have.
        // hasChildNodes() is chosen because it should be cheap.
        Node.prototype.hasChildNodes.apply(elem as Node)
    } catch (e) {
        // Don't throw a real exception because addEventListener wouldn't and we
        // don't want to break content code.
        logger.error("Elem is not a real Node", elem)
        return
    }

    switch (event) {
        case "click":
        case "mousedown":
        case "mouseup":
        case "mouseover":
            if (add) {
                hintworthy_js_elems.push(elem)
            } else {
                // Possible bug: If a page adds an event listener for "click" and
                // "mousedown" and removes "mousedown" twice, we lose track of the
                // elem even though it still has a "click" listener.
                // Fixing this might not be worth the added complexity.
                let index = hintworthy_js_elems.indexOf(elem)
                if (index >= 0) hintworthy_js_elems.splice(index, 1)
            }
    }
}

/** Replace the page's addEventListener with a closure containing a reference
 *  to the original addEventListener and [[registerEvListenerAction]]. Do the
 *  same with removeEventListener.
 */
export function hijackPageListenerFunctions(): void {
    let exportedName = "registerEvListenerAction"
    exportFunction(registerEvListenerAction, window, { defineAs: exportedName })

    let eval_str = ["addEventListener", "removeEventListener"].reduce(
        (acc, cur) => `${acc};
      EventTarget.prototype.${cur} = ((realFunction, register) => {
         return function (...args) {
               let result = realFunction.apply(this, args)
               try {
                  register(this, ${cur === "addEventListener"}, args[0])
               } catch (e) {
                  // Don't let the page know something wrong happened here
               }
               return result
         }
      })(EventTarget.prototype.${cur}, ${exportedName})`,
        "",
    )

    window.eval(eval_str + `;delete ${exportedName}`)
}

/** Focuses an input element and makes sure the cursor is put at the end of the input */
export function focus(e: HTMLElement): void {
    e.focus()
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange
    // "Note that accordingly to the WHATWG forms spec selectionStart,
    // selectionEnd properties and setSelectionRange method apply only to
    // inputs of types text, search, URL, tel and password"
    // So you can't put the cursor at the end of an email field. I can't
    // believe how stupid this is.
    if (
        e instanceof HTMLInputElement &&
        ["text", "search", "url", "tel", "password"].includes(
            e.type.toLowerCase(),
        )
    ) {
        let pos = 0
        if (config.get("cursorpos") === "end") pos = e.value.length
        e.setSelectionRange(pos, pos)
    }
}

/** DOM reference to the last used Input field
 */
//#content_helper
let LAST_USED_INPUT: HTMLElement = null

export function getLastUsedInput(): HTMLElement {
    return LAST_USED_INPUT
}

/** WARNING: This function can potentially recieve malicious input! For the
 *  whole discussion about this, see
 *  https://github.com/cmcaine/tridactyl/pull/225
 *
 *  Remember to check whether WebComponents change anything security-wise:
 *  https://developer.mozilla.org/en-US/docs/Web/Web_Components/Custom_Elements
 *  https://bugzilla.mozilla.org/show_bug.cgi?id=1406825
 * */
function onPageFocus(elem: HTMLElement, args: any[]): boolean {
    if (isTextEditable(elem)) {
        LAST_USED_INPUT = elem
    }
    return config.get("allowautofocus") == "true"
}

async function setInput(el) {
    let tab = await activeTabId()
    // store maximum of 10 elements to stop this getting bonkers huge
    const arr = state.prevInputs.concat({ tab, inputId: el.id })
    state.prevInputs = arr.slice(Math.max(arr.length - 10, 0))
}

/** Replaces the page's HTMLElement.prototype.focus with our own, onPageFocus */
function hijackPageFocusFunction(): void {
    let exportedName = "onPageFocus"
    exportFunction(onPageFocus, window, { defineAs: exportedName })

    let eval_str = `HTMLElement.prototype.focus = ((realFocus, ${exportedName}) => {
        return function (...args) {
            if (${exportedName}(this, args))
                return realFocus.apply(this, args)
        }
     })(HTMLElement.prototype.focus, ${exportedName})`

    window.eval(eval_str + `;delete ${exportedName}`)
}

export function setupFocusHandler(): void {
    // Handles when a user selects an input
    document.addEventListener("focusin", e => {
        if (isTextEditable(e.target as HTMLElement)) {
            LAST_USED_INPUT = e.target as HTMLElement
            setInput(e.target as HTMLInputElement)
        }
    })
    // Handles when the page tries to select an input
    hijackPageFocusFunction()
}
