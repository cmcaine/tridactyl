/* tslint:disable:import-spacing */

// Be careful: typescript elides imports that appear not to be used if they're
// assigned to a name.  If you want an import just for its side effects, make
// sure you import it like this:
import "@src/lib/html-tagged-template"
/* import "@src/content/commandline_content" */
/* import "@src/excmds_content" */
/* import "@src/content/hinting" */
import * as Config from "@src/lib/config"
import * as Logging from "@src/lib/logging"
import * as modeindicator from "@src/content/modeindicator"

// Our local state
import * as state_content from "@src/content/state_content"

// Set up our controller to execute content-mode excmds. All code
// running from this entry point, which is to say, everything in the
// content script, will use the excmds that we give to the module
// here.
import * as controller from "@src/lib/controller"
import * as excmds_content from "@src/.excmds_content.generated"
import { CmdlineCmds } from "@src/content/commandline_cmds"
import { EditorCmds } from "@src/content/editor"

// Hook the keyboard up to the controller
import * as controller_content from "@src/content/controller_content"
import { getAllDocumentFrames } from "@src/lib/dom"

// Add various useful modules to the window for debugging
import * as commandline_content from "@src/content/commandline_content"
import * as convert from "@src/lib/convert"
import * as config from "@src/lib/config"
import * as dom from "@src/lib/dom"
import * as hinting_content from "@src/content/hinting"
import * as finding_content from "@src/content/finding"
import * as itertools from "@src/lib/itertools"
import * as messaging from "@src/lib/messaging"
import state from "@src/state"
import * as webext from "@src/lib/webext"
import Mark from "mark.js"
import * as perf from "@src/perf"
import * as keyseq from "@src/lib/keyseq"
import * as native from "@src/lib/native"
import * as styling from "@src/content/styling"
import { EditorCmds as editor } from "@src/content/editor"
import * as updates from "@src/lib/updates"

// Set up our logger
const logger = new Logging.Logger("content")

function injectTriIntoWindow() {
    ;(window as any).tri = Object.assign(Object.create(null), {
        browserBg: webext.browserBg,
        commandline_content,
        convert,
        config,
        dom,
        editor,
        excmds_content,
        finding_content,
        hinting_content,
        itertools,
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

        // Listen for statistics from each content script and send
        // them to the background for collection. Attach the observer
        // to the window object to keep it trivially reachable, since
        // there's apparently a bug that causes performance observers
        // to be GC'd even if they're still the target of a callback.
        perfObserver: perf.listenForCounters(),
    })
}

function setupPageListenerHijacks() {
    // Don't hijack on the newtab page.
    if (webext.inContentScript()) {
        try {
            dom.setupFocusHandler()
            dom.hijackPageListenerFunctions()
        } catch (e) {
            logger.warning("Could not hijack due to CSP:", e)
        }
    } else {
        logger.warning("No export func")
    }
}

// Some sites like to prevent firefox's `/` from working so we need to
// protect ourselves against that
function addProtectSlashListener(state: state_content.State) {
    try {
        // On quick loading pages, the document is already loaded
        document.body.addEventListener("keydown", e => protectSlash(state, e))
    } catch (e) {
        // But on slower pages we wait for the document to load
        window.addEventListener("DOMContentLoaded", () => {
            document.body.addEventListener("keydown", e =>
                protectSlash(state, e),
            )
        })
    }
}

function protectSlash(state, e) {
    if ("/".indexOf(e.key) !== -1 && state.mode === "normal") {
        e.cancelBubble = true
        e.stopImmediatePropagation()
    }
}

export function runTridactylContent() {
    // We need to grab a lock because sometimes Firefox will decide to
    // insert the content script in the page multiple times
    if ((window as any).tridactyl_content_lock !== undefined) {
        throw Error("Trying to load Tridactyl, but it's already loaded.")
    }
    ;(window as any).tridactyl_content_lock = "locked"

    logger.debug("Tridactyl content script loaded, boss!")

    // Our mode and other "global" state.
    //
    // TODO: initialize this variable here and kill the global.
    const state = state_content.contentState

    const excmd_acceptor = new controller.ExcmdAcceptor({
        "": excmds_content,
        ex: CmdlineCmds,
        text: EditorCmds,
    })
    // TODO: Propagate the excmdAccepter far enough down that we can
    // get rid of this global
    controller.setGlobalAccepter(excmd_acceptor)

    // Add listeners to handle RPCs over messaging
    messaging.addListener(
        "excmd_content",
        messaging.attributeCaller(excmds_content),
    )
    messaging.addListener(
        "controller_content",
        messaging.attributeCaller(excmd_acceptor),
    )

    // Add listeners to handle window events
    const key_controller = new controller_content.Controller(state)
    key_controller.addKeyEventListenersTo(window)
    document.addEventListener("readystatechange", _ =>
        getAllDocumentFrames().forEach(f =>
            key_controller.addKeyEventListenersTo(f),
        ),
    )

    // Hijack all of the page's event listeners so we can catch everything
    setupPageListenerHijacks()

    // Add the mode indicator, if configured
    if (config.get("modeindicator")) {
        modeindicator.addModeIndicator(state)
    }

    // The configuration to not protect slash was originally a
    // github-specific fix
    if (Config.get("leavegithubalone") === "true") {
        addProtectSlashListener(state)
    }

    injectTriIntoWindow()
}
