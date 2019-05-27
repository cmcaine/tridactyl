/** Content script entry point */

// We need to grab a lock because sometimes Firefox will decide to insert the content script in the page multiple times
if ((window as any).tridactyl_content_lock !== undefined) {
    throw Error("Trying to load Tridactyl, but it's already loaded.")
}
(window as any).tridactyl_content_lock = "locked"

// Be careful: typescript elides imports that appear not to be used if they're
// assigned to a name.  If you want an import just for its side effects, make
// sure you import it like this:
import "@src/lib/html-tagged-template"
/* import "@src/content/commandline_content" */
/* import "@src/excmds_content" */
/* import "@src/content/hinting" */
import * as Config from "@src/lib/config"
import * as Logging from "@src/lib/logging"
const logger = new Logging.Logger("content")
logger.debug("Tridactyl content script loaded, boss!")

// Our local state
import {
    contentState,
    addContentStateChangedListener,
} from "@src/content/state_content"

// Set up our controller to execute content-mode excmds. All code
// running from this entry point, which is to say, everything in the
// content script, will use the excmds that we give to the module
// here.
import * as controller from "@src/lib/controller"
import * as excmds_content from "@src/.excmds_content.generated"
import { CmdlineCmds } from "@src/content/commandline_cmds"
import { EditorCmds } from "@src/content/editor"
controller.setExCmds({
    "": excmds_content,
    "ex": CmdlineCmds,
    "text": EditorCmds
})
messaging.addListener("excmd_content", messaging.attributeCaller(excmds_content))
messaging.addListener("controller_content", messaging.attributeCaller(controller))

// Hook the keyboard up to the controller
import * as ContentController from "@src/content/controller_content"
import { getAllDocumentFrames } from "@src/lib/dom"
function listen(elem) {
    elem.removeEventListener("keydown", ContentController.acceptKey, true)
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
    elem.addEventListener("keydown", ContentController.acceptKey, true)
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

// Add various useful modules to the window for debugging
import * as commandline_content from "@src/content/commandline_content"
import * as convert from "@src/lib/convert"
import * as config from "@src/lib/config"
import * as dom from "@src/lib/dom"
import * as excmds from "@src/.excmds_content.generated"
import * as hinting_content from "@src/content/hinting"
import * as finding_content from "@src/content/finding"
import * as itertools from "@src/lib/itertools"
import * as messaging from "@src/lib/messaging"
import state from "@src/state"
import * as webext from "@src/lib/webext"
import Mark from "mark.js"
import * as perf from "@src/perf"
import * as keyseq from "@src/lib/keyseq"
import * as native from "@src/lib/generated/native"
import * as styling from "@src/content/styling"
import { EditorCmds as editor } from "@src/content/editor"
import * as updates from "@src/lib/updates"
/* tslint:disable:import-spacing */
; (window as any).tri = Object.assign(Object.create(null), {
    browserBg: webext.browserBg,
    commandline_content,
    convert,
    config,
    dom,
    editor,
    excmds,
    finding_content,
    hinting_content,
    itertools,
    logger,
    Mark,
    keyseq,
    messaging,
    state,
    webext,
    l: prom => prom.then(console.log).catch(console.error),
    native,
    styling,
    contentLocation: window.location,
    perf,
    updates,
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
                document.body.style.height = "100%"
                document.body.style.opacity = "1"
                document.body.style.overflow = "auto"
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
                    `border: ${container.colorCode} solid 1.5px !important`,
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
            statusIndicator.textContent = "insert"
            // this doesn't work; statusIndicator.style is full of empty string
            // statusIndicator.style.borderColor = "green !important"
            // need to fix loss of focus by click: doesn't do anything here.
        } else if (
            mode === "insert" &&
            !dom.isTextEditable(document.activeElement)
        ) {
            statusIndicator.textContent = "normal"
            // statusIndicator.style.borderColor = "lightgray !important"
        } else {
            result = mode
        }
        const modeindicatorshowkeys = Config.get("modeindicatorshowkeys")
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

        if (config.get("modeindicator") !== "true") statusIndicator.remove()
    })
})

function protectSlash(e) {
    if ("/".indexOf(e.key) !== -1 && contentState.mode === "normal") {
        e.cancelBubble = true
        e.stopImmediatePropagation()
    }
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

// Listen for statistics from each content script and send them to the
// background for collection. Attach the observer to the window object
// since there's apparently a bug that causes performance observers to
// be GC'd even if they're still the target of a callback.
; (window as any).tri = Object.assign(window.tri, {
    perfObserver: perf.listenForCounters(),
})
