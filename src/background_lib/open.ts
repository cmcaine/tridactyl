import * as config from "@src/lib/config"
import * as Logging from "@src/lib/logging"
import { AutoContain } from "@src/lib/autocontainers"
import { activeTab, activeTabContainerId, openInTab, openInNewTab, ABOUT_WHITELIST } from "@src/lib/webext"
import * as Container from "@src/lib/containers"
import Native from "@src/lib/generated/native"
import excmd_tabs from "@src/lib/generated/tabs"

const logger = new Logging.Logger("excmds")

export async function tabopen(...addressarr: string[]) {
    let active
    let container

    const win = await browser.windows.getCurrent()

    // Lets us pass both -b and -c in no particular order as long as they are up front.
    async function argParse(args): Promise<string[]> {
        if (args[0] === "-b") {
            active = false
            args.shift()
            argParse(args)
        } else if (args[0] === "-c") {
            // Ignore the -c flag if incognito as containers are disabled.
            if (!win.incognito) container = await Container.fuzzyMatch(args[1])
            else logger.error("[tabopen] can't open a container in a private browsing window.")

            args.shift()
            args.shift()
            argParse(args)
        }
        return args
    }

    const query = await argParse(addressarr)

    const address = query.join(" ")
    if (!ABOUT_WHITELIST.includes(address) && address.match(/^(about|file):.*/)) {
        return nativeopen(address)
    }

    const aucon = new AutoContain()
    if (!container && aucon.autocontainConfigured()) {
        const autoContainer = await aucon.getAuconForUrl(address)
        if (autoContainer && autoContainer !== "firefox-default") {
            container = autoContainer
            logger.debug("tabopen setting container automatically using autocontain directive")
        }
    }

    return activeTabContainerId().then(containerId => {
        const args = { active } as any
        // Ensure -c has priority.
        if (container) {
            args.cookieStoreId = container
        } else if (containerId && config.get("tabopencontaineraware") === "true") {
            args.cookieStoreId = containerId
        }
        return openInNewTab(null, args).then(tab => openInTab(tab, { loadReplace: true }, query))
    })
}

export async function nativeopen(...args: string[]) {
    const index = args.findIndex(arg => !arg.startsWith("-"))
    let firefoxArgs = []
    if (index >= 0) {
        firefoxArgs = args.slice(0, index)
    }
    const url = args.slice(firefoxArgs.length).join(" ")

    if (await Native.nativegate()) {
        // First compute where the tab should be
        const pos = await config.getAsync("tabopenpos")
        let index = (await activeTab()).index + 1
        switch (pos) {
            case "last":
                index = -1
                break
            case "related":
                // How do we simulate that?
                break
        }
        // Then make sure the tab is made active and moved to the right place
        // when it is opened in the current window
        const selecttab = tab => {
            browser.tabs.onCreated.removeListener(selecttab)
            excmd_tabs.tabSetActive(tab.id)
            browser.tabs.move(tab.id, { index })
        }
        browser.tabs.onCreated.addListener(selecttab)

        try {
            if ((await browser.runtime.getPlatformInfo()).os === "mac") {
                if ((await browser.windows.getCurrent()).incognito) {
                    throw "nativeopen isn't supported in private mode on OSX. Consider installing Linux or Windows :)."
                }
                const osascriptArgs = ["-e 'on run argv'", "-e 'tell application \"Firefox\" to open location item 1 of argv'", "-e 'end run'"]
                await Native.run("osascript " + osascriptArgs.join(" ") + " " + url)
            } else {
                const os = (await browser.runtime.getPlatformInfo()).os
                if (firefoxArgs.length === 0) {
                    try {
                        const profile = await Native.getProfile()
                        if (profile.Name !== undefined) {
                            firefoxArgs = [`-p ${profile.Name}`]
                        } else if (profile.absolutePath !== undefined) {
                            if (os === "win") {
                                firefoxArgs = [`--profile "${profile.absolutePath}"`]
                            } else {
                                firefoxArgs = [`--profile '${profile.absolutePath}'`]
                            }
                        }
                    } catch (e) {
                        logger.debug(e)
                        firefoxArgs = []
                    }
                    firefoxArgs.push("--new-tab")
                }
                let escapedUrl = url
                // On linux, we need to quote and escape single quotes in the
                // url, otherwise an attacker could create an anchor with a url
                // like 'file:// && $(touch /tmp/dead)' and achieve remote code
                // execution when the user tries to follow it with `hint -W tabopen`
                // But windows treats single quotes as "open this file from the
                // user's directory", so we need to use double quotes there
                if (os === "win") {
                    escapedUrl = `"${escapedUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
                } else {
                    escapedUrl = `'${escapedUrl.replace(/'/g, '"\'"')}'`
                }
                await Native.run(`${config.get("browser")} ${firefoxArgs.join(" ")} ${escapedUrl}`)
            }
            setTimeout(() => browser.tabs.onCreated.removeListener(selecttab), 100)
        } catch (e) {
            browser.tabs.onCreated.removeListener(selecttab)
            throw e
        }
    }
}
