/** Background script entry point. */

/* tslint:disable:import-spacing */

import "@src/lib/browser_proxy_background"

import * as controller from "@src/lib/controller"
import * as perf from "@src/perf"
import { listenForCounters } from "@src/perf"
import * as messaging from "@src/lib/messaging"
import * as excmds_background from "@src/.excmds_background.generated"
import { CmdlineCmds } from "@src/background/commandline_cmds"
import { EditorCmds } from "@src/background/editor"
import * as convert from "@src/lib/convert"
import * as config from "@src/lib/config"
import * as dom from "@src/lib/dom"
import * as download_background from "@src/background/download_background"
import * as itertools from "@src/lib/itertools"
import * as keyseq from "@src/lib/keyseq"
import * as request from "@src/lib/requests"
import * as native from "@src/lib/native"
import state from "@src/state"
import * as webext from "@src/lib/webext"
import { AutoContain } from "@src/lib/autocontainers"
import * as extension_info from "@src/lib/extension_info"

// Add various useful modules to the window for debugging
; (window as any).tri = Object.assign(Object.create(null), {
    messaging,
    excmds: excmds_background,
    convert,
    config,
    dom,
    download_background,
    itertools,
    native,
    keyseq,
    request,
    state,
    webext,
    l: prom => prom.then(console.log).catch(console.error),
    contentLocation: window.location,
    perf,
})

// Set up our controller to execute background-mode excmds. All code
// running from this entry point, which is to say, everything in the
// background script, will use the excmds that we give to the module
// here.
controller.setExCmds({
    "": excmds_background,
    "ex": CmdlineCmds,
    "text": EditorCmds
})
messaging.addListener("excmd_background", messaging.attributeCaller(excmds_background))
messaging.addListener("controller_background", messaging.attributeCaller(controller))

// {{{ tri.contentLocation
// When loading the background, use the active tab to know what the current content url is
browser.tabs.query({ currentWindow: true, active: true }).then(t => {
    (window as any).tri.contentLocation = new URL(t[0].url)
})
// After that, on every tab change, update the current url
let contentLocationCount = 0
browser.tabs.onActivated.addListener(ev => {
    const myId = contentLocationCount + 1
    contentLocationCount = myId
    browser.tabs.get(ev.tabId).then(t => {
        // Note: we're using contentLocationCount and myId in order to make sure that only the last onActivated event is used in order to set contentLocation
        // This is needed because otherWise the following chain of execution might happen: onActivated1 => onActivated2 => tabs.get2 => tabs.get1
        if (contentLocationCount === myId) {
            (window as any).tri.contentLocation = new URL(t.url)
        }
    })
})

// {{{ Clobber CSP

// This should be removed once https://bugzilla.mozilla.org/show_bug.cgi?id=1267027 is fixed
function addCSPListener() {
    browser.webRequest.onHeadersReceived.addListener(
        request.clobberCSP,
        { urls: ["<all_urls>"], types: ["main_frame"] },
        ["blocking", "responseHeaders"],
    )
}

function removeCSPListener() {
    browser.webRequest.onHeadersReceived.removeListener(request.clobberCSP)
}

config.getAsync("csp").then(csp => csp === "clobber" && addCSPListener())

config.addChangeListener("csp", (old, cur) => {
    if (cur === "clobber") {
        addCSPListener()
    } else {
        removeCSPListener()
    }
})

// }}}

// Prevent Tridactyl from being updated while it is running in the hope of fixing #290
browser.runtime.onUpdateAvailable.addListener(_ => undefined)

browser.runtime.onStartup.addListener(_ => {
    config.getAsync("autocmds", "TriStart").then(aucmds => {
        const hosts = Object.keys(aucmds)
        // If there's only one rule and it's "all", no need to check the hostname
        if (hosts.length === 1 && hosts[0] === ".*") {
            controller.acceptExCmd(aucmds[hosts[0]])
        } else {
            native.run("hostname").then(hostname => {
                for (const host of hosts) {
                    if (hostname.content.match(host)) {
                        controller.acceptExCmd(aucmds[host])
                    }
                }
            })
        }
    })
})

// Nag people about updates.
// Hope that they're on a tab we can access.
config.getAsync("update", "nag").then(nag => {
    if (nag === true) excmds_background.updatecheck("auto_polite")
})

// }}}

// {{{ AUTOCOMMANDS

// We could use ev.previousTabId here, but that field is empty when a
// tab is closed, and we do want to run "TabLeft" commands when that
// happens. Instead, we assume that the user can only be in one tab at
// a time and the last tab we entered has to be the one we're leaving.
let curTab = null
browser.tabs.onActivated.addListener(ev => {
    const ignore = _ => _
    if (curTab !== null) {
        // messaging.messageTab failing can happen when leaving
        // privileged tabs (e.g. about:addons) or when the tab is
        // being closed.
        messaging
            .messageTab(curTab, "excmd_content", "loadaucmds", ["TabLeft"])
            .catch(ignore)
    }
    curTab = ev.tabId
    messaging
        .messageTab(curTab, "excmd_content", "loadaucmds", ["TabEnter"])
        .catch(ignore)
})

// DownloadPost autocommand.
browser.downloads.onChanged.addListener(async (ev: any) => {
    if (ev.state && ev.state.current === "complete") {
        const dlItem: browser.downloads.DownloadItem = (await browser.downloads.search({id: ev.id}))[0]
        const args: AutocmdArgs = {
            url: dlItem.url,
            file: dlItem.filename,
            size: dlItem.fileSize
        }
        messaging
            .messageActiveTab("excmd_content", "loadaucmds", ["DownloadPost", args])
    }
})
// }}}

// {{{ AUTOCONTAINERS

extension_info.init()

const aucon = new AutoContain()

// Handle cancelled requests as a result of autocontain.
browser.webRequest.onCompleted.addListener(aucon.completedRequestListener, {
    urls: ["<all_urls>"],
    types: ["main_frame"],
})

browser.webRequest.onErrorOccurred.addListener(aucon.completedRequestListener, {
    urls: ["<all_urls>"],
    types: ["main_frame"],
})

// Contain autocmd.
browser.webRequest.onBeforeRequest.addListener(
    aucon.autoContain,
    { urls: ["<all_urls>"], types: ["main_frame"] },
    ["blocking"],
)

browser.tabs.onCreated.addListener(
    aucon.tabCreatedListener,
)

// }}}

// {{{ PERFORMANCE LOGGING

// An object to collect all of our statistics in one place.
const statsLogger: perf.StatsLogger = new perf.StatsLogger()
messaging.addListener(
    "performance_background",
    messaging.attributeCaller(statsLogger),
)
// Listen for statistics from the background script and store
// them. Set this one up to log directly to the statsLogger instead of
// going through messaging.
const perfObserver = listenForCounters(statsLogger)
window.tri = Object.assign(window.tri || Object.create(null), {
    // Attach the perf observer to the window object, since there
    // appears to be a bug causing performance observers to be GC'd
    // even if they're still the target of a callback.
    perfObserver,
    // Also attach the statsLogger so we can access our stats from the
    // console.
    statsLogger,
})

// }}}
