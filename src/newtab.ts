// This file is only included in newtab.html, after content.js has been loaded

import * as Messaging from "@src/lib/messaging"
import * as config from "@src/lib/config"
import * as excmds_content from "@src/.excmds_content.generated"

// These functions work with the elements created by tridactyl/scripts/newtab.md.sh
function getChangelogDiv() {
    const changelogDiv = document.getElementById("changelog")
    if (!changelogDiv) throw new Error("Couldn't find changelog element!")
    return changelogDiv
}

function updateChangelogStatus() {
    const changelogDiv = getChangelogDiv()
    const changelogContent = changelogDiv.textContent
    if (localStorage.changelogContent === changelogContent) {
        const changelogButton = document.querySelector('input[id^="spoiler"]')
        if (!changelogButton) {
            console.error("Couldn't find changelog button!")
            return
        }
        changelogButton.classList.add("seen")
    }
}

function readChangelog() {
    const changelogDiv = getChangelogDiv()
    localStorage.changelogContent = changelogDiv.textContent
    updateChangelogStatus()
}

window.addEventListener("load", updateChangelogStatus)
window.addEventListener("load", _ => {
    const spoilerbutton = document.getElementById("spoilerbutton")
    if (!spoilerbutton) {
        console.error("Couldn't find spoiler button!")
        return
    }
    spoilerbutton.addEventListener("click", readChangelog)
    config.getAsync("newtabfocus").then(f => {
        if (f === "page") {
            window.focus()
        }
    })
})

// Periodically nag people about updates.
window.addEventListener("load", _ => {
    if (config.get("update", "nag") === true) {
        Messaging.message("controller_background", "acceptExCmd", [
            "updatecheck auto_polite",
        ])
    }
})

config.getAsync("newtab").then(newtab => {
    if (newtab !== "about:blank") {
        if (newtab) {
            excmds_content.open_quiet(newtab)
        } else {
            document.body.style.height = "100%"
            document.body.style.opacity = "1"
            document.body.style.overflow = "auto"
            document.title = "Tridactyl Top Tips & New Tab Page"
        }
    }
})
