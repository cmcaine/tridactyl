/** Content script entry point */

// We need to grab a lock because sometimes Firefox will decide to insert the content script in the page multiple times
if ((window as any).tridactyl_content_lock !== undefined) {
    throw Error("Trying to load Tridactyl, but it's already loaded.")
}
;(window as any).tridactyl_content_lock = "locked"

// Be careful: typescript elides imports that appear not to be used if they're
// assigned to a name.  If you want an import just for its side effects, make
// sure you import it like this:
import "@src/lib/html-tagged-template"
/* import "@src/content/commandline_content" */
/* import "@src/excmds_content" */
/* import "@src/content/hinting" */
import * as config from "@src/lib/config"
import * as Logging from "@src/lib/logging"
const logger = new Logging.Logger("content")
logger.debug("Tridactyl content script loaded, boss!")

// Our local state
import {
    contentState,
    addContentStateChangedListener,
} from "@src/content/state_content"

import { CmdlineCmds } from "@src/content/commandline_cmds"
import { EditorCmds } from "@src/content/editor"

import { getAllDocumentFrames } from "@src/lib/dom"

import state from "@src/state"
import { EditorCmds as editor } from "@src/content/editor"
/* tslint:disable:import-spacing */

config.getAsync("disable").then(async TRI_DISABLE => {
// Set up our controller to execute content-mode excmds. All code
// running from this entry point, which is to say, everything in the
// content script, will use the excmds that we give to the module
// here.
const controller = await import("@src/lib/controller")
const excmds_content = await import("@src/.excmds_content.generated")
const hinting_content = await import("@src/content/hinting")
// Hook the keyboard up to the controller
const ContentController = await import("@src/content/controller_content")
// Add various useful modules to the window for debugging
const commandline_content = await import("@src/content/commandline_content")
const convert = await import("@src/lib/convert")
const dom = await import("@src/lib/dom")
const excmds = await import("@src/.excmds_content.generated")
const finding_content = await import("@src/content/finding")
const itertools = await import("@src/lib/itertools")
const messaging = await import("@src/lib/messaging")
const State = await import("@src/state")
const webext = await import("@src/lib/webext")
const perf = await import("@src/perf")
const keyseq = await import("@src/lib/keyseq")
const native = await import("@src/lib/native")
const styling = await import("@src/content/styling")
const updates = await import("@src/lib/updates")
const urlutils = await import("@src/lib/url_util")
const scrolling = await import("@src/content/scrolling")
const R = await import("ramda")
const visual = await import("@src/lib/visual")
const metadata = await import("@src/.metadata.generated")

if (TRI_DISABLE === "true") return

controller.setExCmds({
    "": excmds_content,
    ex: CmdlineCmds,
    text: EditorCmds,
    hint: hinting_content.getHintCommands(),
})
messaging.addListener(
    "excmd_content",
    messaging.attributeCaller(excmds_content),
)
messaging.addListener(
    "controller_content",
    messaging.attributeCaller(controller),
)

// eslint-disable-next-line @typescript-eslint/require-await
messaging.addListener("alive", async () => true)

const guardedAcceptKey = (keyevent: KeyboardEvent) => {
    if (!keyevent.isTrusted) return
    ContentController.acceptKey(keyevent)
}
function listen(elem) {
    elem.removeEventListener("keydown", guardedAcceptKey, true)
    elem.removeEventListener(
        "keypress",
        ContentController.canceller.cancelKeyPress,
        true,
    )
    elem.removeEventListener(
        "keyup",
        ContentController.canceller.cancelKeyUp,
        true,
    )
    elem.addEventListener("keydown", guardedAcceptKey, true)
    elem.addEventListener(
        "keypress",
        ContentController.canceller.cancelKeyPress,
        true,
    )
    elem.addEventListener(
        "keyup",
        ContentController.canceller.cancelKeyUp,
        true,
    )
}
listen(window)
document.addEventListener("readystatechange", _ =>
    getAllDocumentFrames().forEach(f => listen(f)),
)

// Prevent pages from automatically focusing elements on load
config.getAsync("preventautofocusjackhammer").then(allowautofocus => {
    if (allowautofocus === "false") {
        return
    }
    const preventAutoFocus = () => {
        // First, blur whatever element is active. This will make sure
        // activeElement is the "default" active element
        ;(document.activeElement as any).blur()
        const elem = document.activeElement as any
        // ???: We need to set tabIndex, otherwise we won't get focus/blur events!
        elem.tabIndex = 0
        const focusElem = () => elem.focus()
        elem.addEventListener("blur", focusElem)
        elem.addEventListener("focusout", focusElem)
        // On top of blur/focusout events, we need to periodically check the
        // activeElement is the one we want because blur/focusout events aren't
        // always triggered when document.activeElement changes
        const interval = setInterval(() => {
            if (document.activeElement != elem) focusElem()
        }, 200)
        // When the user starts interacting with the page, stop resetting focus
        function stopResettingFocus(event: Event) {
            if (!event.isTrusted) return
            elem.removeEventListener("blur", focusElem)
            elem.removeEventListener("focusout", focusElem)
            clearInterval(interval)
            window.removeEventListener("keydown", stopResettingFocus)
            window.removeEventListener("mousedown", stopResettingFocus)
        }
        window.addEventListener("keydown", stopResettingFocus)
        window.addEventListener("mousedown", stopResettingFocus)
    }
    const tryPreventAutoFocus = () => {
        document.removeEventListener("readystatechange", tryPreventAutoFocus)
        try {
            preventAutoFocus()
        } catch (e) {
            document.addEventListener("readystatechange", tryPreventAutoFocus)
        }
    }
    tryPreventAutoFocus()
})
;(window as any).tri = Object.assign(Object.create(null), {
    browserBg: webext.browserBg,
    commandline_content,
    convert,
    config,
    controller,
    dom,
    editor,
    excmds,
    finding_content,
    hinting_content,
    itertools,
    logger,
    metadata,
    keyseq,
    messaging,
    state,
    State,
    scrolling,
    visual,
    webext,
    l: prom => prom.then(console.log).catch(console.error),
    native,
    styling,
    contentLocation: window.location,
    perf,
    R,
    updates,
    urlutils,
})

logger.info("Loaded commandline content?", commandline_content)

try {
    dom.setupFocusHandler()
    dom.hijackPageListenerFunctions()
} catch (e) {
    logger.warning("Could not hijack due to CSP:", e)
}

if (
    window.location.protocol === "moz-extension:" &&
    window.location.pathname === "/static/newtab.html"
) {
    config.getAsync("newtab").then(newtab => {
        if (newtab !== "about:blank") {
            if (newtab) {
                excmds.open_quiet(newtab)
            } else {
                const content = document.getElementById("trinewtab")
                content.style.display = "block"
                document.title = "Tridactyl Top Tips & New Tab Page"
            }
        }
    })
}

// Really bad status indicator
config.getAsync("modeindicator").then(mode => {
    if (mode !== "true") return

    // Do we want container indicators?
    const containerIndicator = config.get("containerindicator")

    // Hide indicator in print mode
    // CSS not explicitly added to the dom doesn't make it to print mode:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1448507
    const style = document.createElement("style")
    style.type = "text/css"
    style.innerHTML = `@media print {
        .TridactylStatusIndicator {
            display: none !important;
        }
    }`

    const statusIndicator = document.createElement("span")
    const privateMode = browser.extension.inIncognitoContext
        ? "TridactylPrivate"
        : ""
    statusIndicator.className =
        "cleanslate TridactylStatusIndicator " +
        privateMode +
        " TridactylModenormal "

    // Dynamically sets the border container color.
    if (containerIndicator === "true") {
        webext
            .ownTabContainer()
            .then(ownTab =>
                webext.browserBg.contextualIdentities.get(ownTab.cookieStoreId),
            )
            .then(container => {
                statusIndicator.setAttribute(
                    "style",
                    `border: ${
                        (container as any).colorCode
                    } solid 1.5px !important`,
                )
            })
            .catch(error => {
                logger.debug(error)
            })
    }

    // This listener makes the modeindicator disappear when the mouse goes over it
    statusIndicator.addEventListener("mouseenter", ev => {
        const target = ev.target as any
        const rect = target.getBoundingClientRect()
        target.classList.add("TridactylInvisible")
        const onMouseOut = ev => {
            // If the mouse event happened out of the mode indicator boundaries
            if (
                ev.clientX < rect.x ||
                ev.clientX > rect.x + rect.with ||
                ev.clientY < rect.y ||
                ev.clientY > rect.y + rect.height
            ) {
                target.classList.remove("TridactylInvisible")
                window.removeEventListener("mousemove", onMouseOut)
            }
        }
        window.addEventListener("mousemove", onMouseOut)
    })

    try {
        // On quick loading pages, the document is already loaded
        statusIndicator.textContent = contentState.mode || "normal"
        document.body.appendChild(statusIndicator)
        document.head.appendChild(style)
    } catch (e) {
        // But on slower pages we wait for the document to load
        window.addEventListener("DOMContentLoaded", () => {
            statusIndicator.textContent = contentState.mode || "normal"
            document.body.appendChild(statusIndicator)
            document.head.appendChild(style)
        })
    }

    addContentStateChangedListener((property, oldMode, oldValue, newValue) => {
        let mode = newValue
        let suffix = ""
        let result = ""
        if (property !== "mode") {
            if (property === "suffix") {
                mode = oldMode
                suffix = newValue
            } else {
                return
            }
        }

        const privateMode = browser.extension.inIncognitoContext
            ? "TridactylPrivate"
            : ""
        statusIndicator.className =
            "cleanslate TridactylStatusIndicator " + privateMode
        if (
            dom.isTextEditable(document.activeElement) &&
            !["input", "ignore"].includes(mode)
        ) {
            result = "insert"
            // this doesn't work; statusIndicator.style is full of empty string
            // statusIndicator.style.borderColor = "green !important"
            // need to fix loss of focus by click: doesn't do anything here.
        } else if (
            mode === "insert" &&
            !dom.isTextEditable(document.activeElement)
        ) {
            result = "normal"
            // statusIndicator.style.borderColor = "lightgray !important"
        } else {
            result = mode
        }
        const modeindicatorshowkeys = config.get("modeindicatorshowkeys")
        if (modeindicatorshowkeys === "true" && suffix !== "") {
            result = mode + " " + suffix
        }
        logger.debug(
            "statusindicator: ",
            result,
            ";",
            "config",
            modeindicatorshowkeys,
        )
        statusIndicator.textContent = result
        statusIndicator.className +=
            " TridactylMode" + statusIndicator.textContent

        if (
            config.get("modeindicator") !== "true" ||
            config.get("modeindicatormodes", mode) === "false"
        ) {
            statusIndicator.remove()
        }
    })
})

function protectSlash(e) {
    if (!e.isTrusted) return
    config.get("blacklistkeys").map(protkey => {
        if (protkey.indexOf(e.key) !== -1 && contentState.mode === "normal") {
            e.cancelBubble = true
            e.stopImmediatePropagation()
        }
    })
}

// Some sites like to prevent firefox's `/` from working so we need to protect
// ourselves against that
// This was originally a github-specific fix
config.getAsync("leavegithubalone").then(v => {
    if (v === "true") return
    try {
        // On quick loading pages, the document is already loaded
        document.body.addEventListener("keydown", protectSlash)
    } catch (e) {
        // But on slower pages we wait for the document to load
        window.addEventListener("DOMContentLoaded", () => {
            document.body.addEventListener("keydown", protectSlash)
        })
    }
})

// I still don't get lib/messaging.ts
const phoneHome = () => browser.runtime.sendMessage("dom_loaded_background")

document.readyState === "complete" && phoneHome()
window.addEventListener("load", () => {
    phoneHome()
})

document.addEventListener("selectionchange", () => {
    const selection = document.getSelection()
    if (
        contentState.mode == "visual" &&
        config.get("visualexitauto") == "true" &&
        selection.anchorOffset == selection.focusOffset
    ) {
        contentState.mode = "normal"
        return
    }
    if (
        contentState.mode !== "normal" ||
        config.get("visualenterauto") == "false"
    )
        return
    if (selection.anchorOffset !== selection.focusOffset) {
        contentState.mode = "visual"
    }
})

// Listen for statistics from each content script and send them to the
// background for collection. Attach the observer to the window object
// since there's apparently a bug that causes performance observers to
// be GC'd even if they're still the target of a callback.
;(window as any).tri = Object.assign(window.tri, {
    perfObserver: perf.listenForCounters(),
})

}) // End of maybe-disable-tridactyl-a-bit wrapper
