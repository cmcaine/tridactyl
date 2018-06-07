import * as config from "./config"
import * as webext from "./lib/webext"
import * as Logging from "./logging"

const logger = new Logging.Logger("styling")

// find a way of getting theme list without hard-coding it
// using a macro might be an option
const THEMES = ["dark", "greenmat", "shydactyl", "quake"]

function capitalise(str) {
    return str[0].toUpperCase() + str.slice(1)
}

function prefixTheme(name) {
    return "TridactylTheme" + capitalise(name)
}

// At the moment elements are only ever `:root` and so this array and stuff is all a bit overdesigned.
const THEMED_ELEMENTS = []

export async function theme(element) {
    // Remove any old theme
    for (let theme of THEMES.map(prefixTheme)) {
        element.classList.remove(theme)
    }

    let newTheme = await config.getAsync("theme")

    // Add a class corresponding to config.get('theme')
    if (newTheme !== "default") {
        element.classList.add(prefixTheme(newTheme))
    }

    // Record for re-theming
    // considering only elements :root (page and cmdline_iframe)
    // TODO:
    //     - Find ways to check if element is already pushed
    if (
        THEMED_ELEMENTS.length < 2 &&
        element.tagName.toUpperCase() === "HTML"
    ) {
        THEMED_ELEMENTS.push(element)
    }
}

function retheme() {
    THEMED_ELEMENTS.forEach(element => {
        try {
            theme(element)
        } catch (e) {
            logger.warning(
                `Failed to retheme element "${element}". Error: ${e}`,
            )
        }
    })
}

// Hacky listener
browser.storage.onChanged.addListener((changes, areaname) => {
    if ("userconfig" in changes) {
        retheme()
    }
})

export async function insertstyle(csscode: string) {
    let tab = await webext.activeTab()
    try {
        //insert css to the current active tab
        await webext.browserBg.tabs.insertCSS({ code: csscode })
    } catch (e) {
        logger.error(
            `It was not possible to insert css on tab "${tab.title}": `,
            e,
        )
    }
}

export async function removestyle(csscode: string) {
    let tab = await webext.activeTab()
    try {
        //insert css to the current active tab
        await webext.browserBg.tabs.removeCSS({ code: csscode })
    } catch (e) {
        logger.error(
            `It was not possible to remove css from tab "${tab.title}": `,
            e,
        )
    }
}

import * as Messaging from "./messaging"
Messaging.addListener(
    "styling_content",
    Messaging.attributeCaller({
        insertstyle,
        removestyle,
    }),
)
