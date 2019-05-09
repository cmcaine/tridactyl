import * as Logging from "@src/lib/logging"
import * as Config from "@src/lib/config"
import * as webext from "@src/lib/webext"
import * as dom from "@src/lib/dom"
import { State } from "@src/content/state_content"

// Set up our logger
const logger = new Logging.Logger("content")

function onModeChanged(
    statusIndicator: HTMLElement,
    property: keyof State,
    newState: State,
    oldValue: any,
) {
    let result = ""

    if (property !== "mode" && property !== "suffix") {
        return
    }

    const privateMode = browser.extension.inIncognitoContext
        ? "TridactylPrivate"
        : ""
    statusIndicator.className =
        "cleanslate TridactylStatusIndicator " + privateMode
    if (
        dom.isTextEditable(document.activeElement) &&
        !["input", "ignore"].includes(newState.mode)
    ) {
        statusIndicator.textContent = "insert"
        // this doesn't work; statusIndicator.style is full of empty string
        // statusIndicator.style.borderColor = "green !important"
        // need to fix loss of focus by click: doesn't do anything here.
    } else if (
        newState.mode === "insert" &&
        !dom.isTextEditable(document.activeElement)
    ) {
        statusIndicator.textContent = "normal"
        // statusIndicator.style.borderColor = "lightgray !important"
    } else {
        result = newState.mode
    }
    const modeindicatorshowkeys = Config.get("modeindicatorshowkeys")
    if (modeindicatorshowkeys === "true" && newState.suffix !== "") {
        result = newState.mode + " " + newState.suffix
    }
    logger.debug(
        "statusindicator: ",
        result,
        ";",
        "config",
        modeindicatorshowkeys,
    )
    statusIndicator.textContent = result
    statusIndicator.className += " TridactylMode" + statusIndicator.textContent

    if (Config.get("modeindicator") !== "true") statusIndicator.remove()
}

// It'd be nice if we could just show it on mouse out, but the thing
// hides itself so completely that the mouse is thought to have
// immediately left. Instead, we remember the target's bounding
// rectangle, register a listener for all mouse movements on the
// entire window, and unhide the target (and remove the "all mouse
// movements" listener >_>) when the mouse moves outside that rect.
function hideOnMouseEnter(ev: MouseEvent) {
    const target = ev.target as HTMLElement
    const rect = target.getBoundingClientRect() as DOMRect
    const cb = ev => showOnMouseLeave(rect, target, ev, cb)

    target.classList.add("TridactylInvisible")
    window.addEventListener("mousemove", cb)
}

function showOnMouseLeave(
    rect: DOMRect,
    target: HTMLElement,
    ev: MouseEvent,
    cb,
) {
    // If the mouse event happened outside the mode indicator
    // boundaries, re-show it.
    if (
        ev.clientX < rect.x ||
        ev.clientX > rect.x + rect.width ||
        ev.clientY < rect.y ||
        ev.clientY > rect.y + rect.height
    ) {
        target.classList.remove("TridactylInvisible")
        window.removeEventListener("mousemove", cb)
    }
}

function addStatusIndicatorToPage(statusIndicator: HTMLElement, state: State) {
    // Hide indicator in print mode
    // CSS not explicitly added to the dom doesn't make it to print mode:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1448507
    const style = document.createElement("style")
    style.type = "text/css"
    style.innerHTML = [
        "@media print {",
        "  .TridactylStatusIndicator {",
        "    display: none !important;",
        "  }",
        "}",
    ].join("\n")

    try {
        // On quick loading pages, the document is already loaded
        statusIndicator.textContent = state.mode || "normal"
        document.body.appendChild(statusIndicator)
        document.head.appendChild(style)
    } catch (e) {
        // But on slower pages we wait for the document to load
        window.addEventListener("DOMContentLoaded", () => {
            statusIndicator.textContent = state.mode || "normal"
            document.body.appendChild(statusIndicator)
            document.head.appendChild(style)
        })
    }
}

async function setColorByContainer(statusIndicator: HTMLElement) {
    try {
        const ownTab = await webext.ownTabContainer()
        const container = await webext.browserBg.contextualIdentities.get(
            ownTab.cookieStoreId,
        )
        statusIndicator.setAttribute(
            "style",
            `border: ${container.colorCode} solid 1.5px !important`,
        )
    } catch (e) {
        logger.debug(e)
    }
}

// Really bad status indicator
export async function addModeIndicator(state: State) {
    const statusIndicator = document.createElement("span")

    const privateMode = browser.extension.inIncognitoContext
        ? "TridactylPrivate"
        : ""
    statusIndicator.className = [
        "cleanslate",
        "TridactylStatusIndicator",
        privateMode + "TridactylModenormal",
    ].join(" ")

    if (Config.get("containerindicator") === "true") {
        setColorByContainer(statusIndicator)
    }

    // Hide the status indicator when the mouse is over it
    statusIndicator.addEventListener("mouseenter", hideOnMouseEnter)

    // Add ourselves to the page
    addStatusIndicatorToPage(statusIndicator, state)

    // Update when the mode changes.
    state.addContentStateChangedListener((...args) =>
        onModeChanged(statusIndicator, ...args),
    )
}
