/** Inject an input element into unsuspecting webpages and provide an API for interaction with tridactyl */

import Logger from "@src/lib/logging"
import * as config from "@src/lib/config"
import { theme } from "@src/content/styling"
const logger = new Logger("messaging")
const cmdline_logger = new Logger("cmdline")

/* TODO:
    CSS
    Friendliest-to-webpage way of injecting commandline bar?
    Security: how to prevent other people's JS from seeing or accessing the bar or its output?
        - Method here is isolation via iframe
            - Web content can replace the iframe, but can't view or edit its content.
            - see doc/escalating-privilege.md for other approaches.
*/

// inject the commandline iframe into a content page

const cmdline_iframe = window.document.createElementNS(
    "http://www.w3.org/1999/xhtml",
    "iframe",
) as HTMLIFrameElement
cmdline_iframe.className = "cleanslate"
cmdline_iframe.setAttribute(
    "src",
    browser.runtime.getURL("static/commandline.html"),
)
cmdline_iframe.setAttribute("id", "cmdline_iframe")
cmdline_iframe.setAttribute("loading", "lazy")

let enabled = false

/** Initialise the cmdline_iframe element unless the window location is included in a value of config/noiframe */
async function init() {
    const noiframe = await config.getAsync("noiframe")
    const notridactyl = await config.getAsync("disable")
    if (noiframe === "false" && notridactyl !== "true" && !enabled) {
        hide()
        document.documentElement.appendChild(cmdline_iframe)
        enabled = true
        // first theming of page root
        await theme(window.document.querySelector(":root"))
    }
}

// Load the iframe immediately if we can (happens if tridactyl is reloaded or on ImageDocument)
// Else load lazily to avoid upsetting page JS that hates foreign iframes.
init().catch(() => {
    // Surrender event loop with setTimeout() to page JS in case it's still doing stuff.
    document.addEventListener("DOMContentLoaded", () =>
        setTimeout(() => {
            init().catch(e =>
                logger.error("Couldn't initialise cmdline_iframe!", e),
            )
        }, 0),
    )
})

export function show(hidehover = false) {
    try {
        /* Hide "hoverlink" pop-up which obscures command line
         *
         * Inspired by VVimpulation: https://github.com/amedama41/vvimpulation/commit/53065d015d1e9a892496619b51be83771f57b3d5
         */

        if (hidehover) {
            const a = window.document.createElement("A")
            ;(a as any).href = ""
            document.body.appendChild(a)
            a.focus({ preventScroll: true })
            document.body.removeChild(a)
        }

        cmdline_iframe.classList.remove("hidden")
        const height =
            cmdline_iframe.contentWindow.document.body.offsetHeight + "px"
        cmdline_iframe.setAttribute("style", `height: ${height} !important;`)
    } catch (e) {
        // Note: We can't use cmdline_logger.error because it will try to log
        // the error in the commandline, which we can't show!
        // cmdline_logger.error(e)
        console.error(e)
    }
}

export function hide() {
    try {
        cmdline_iframe.classList.add("hidden")
        cmdline_iframe.setAttribute("style", "height: 0px !important;")
    } catch (e) {
        // Using cmdline_logger here is OK because cmdline_logger won't try to
        // call hide(), thus we avoid the recursion that happens for show() and
        // focus()
        cmdline_logger.error(e)
    }
}

export function focus() {
    try {
        cmdline_iframe.focus()
    } catch (e) {
        // Note: We can't use cmdline_logger.error because it will try to log
        // the error in the commandline, which will need to focus() it again,
        // which will throw again...
        // cmdline_logger.error(e)
        console.error(e)
    }
}

export function blur() {
    try {
        cmdline_iframe.blur()
    } catch (e) {
        // Same as with hide(), it's ok to use cmdline_logger here
        cmdline_logger.error(e)
    }
}

export function hide_and_blur() {
    hide()
    blur()
}

export function executeWithoutCommandLine(fn) {
    let parent
    if (cmdline_iframe) {
        parent = cmdline_iframe.parentNode
        parent.removeChild(cmdline_iframe)
    }
    let result
    try {
        result = fn()
    } catch (e) {
        cmdline_logger.error(e)
    }
    if (cmdline_iframe) parent.appendChild(cmdline_iframe)
    return result
}

import * as Messaging from "@src/lib/messaging"
import * as SELF from "@src/content/commandline_content"
Messaging.addListener("commandline_content", Messaging.attributeCaller(SELF))
