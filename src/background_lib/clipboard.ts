import * as Native from "@src/lib/native"
import { messageActiveTab } from "@src/lib/messaging"
import { EditorCmds } from "@src/background/editor"
import * as config from "@src/lib/config"
import { activeTab } from "@src/lib/webext"

import excmd_fillcmdline from "@src/lib/generated/fillcmdline"
import excmd_open from "@src/lib/generated/open"

export async function yank(...content: string[]) {
    return setclip(content.join(" "))
}

/**
 * Copies a string to the clipboard/selection buffer depending on the user's preferences
 */
async function setclip(str) {
    // Functions to avoid retyping everything everywhere

    // Note: We're using fillcmdline here because exceptions are somehow not caught. We're rethrowing because otherwise the error message will be overwritten with the "yank successful" message.
    const s = () => Native.clipboard("set", str)
    const c = () => messageActiveTab("commandline_frame", "setClipboard", [str])

    let promises = []
    switch (await config.getAsync("yankto")) {
        case "selection":
            promises = [s()]
            break
        case "clipboard":
            promises = [c()]
            break
        case "both":
            promises = [s(), c()]
            break
    }
    return Promise.all(promises)
}

export async function getclip(fromm?: "clipboard" | "selection") {
    if (fromm === undefined) fromm = await config.getAsync("putfrom")
    if (fromm === "clipboard") {
        return messageActiveTab("commandline_frame", "getClipboard")
    } else {
        return Native.clipboard("get", "")
    }
}

export async function clipboard(excmd: "open" | "yank" | "yankshort" | "yankcanon" | "yanktitle" | "yankmd" | "xselpaste" | "tabopen" = "open", ...toYank: string[]) {
    let content = toYank.join(" ")
    let url = ""
    let urls = []
    switch (excmd) {
        case "yankshort":
            urls = await geturlsforlinks("rel", "shortlink")
            if (urls.length === 0) {
                urls = await geturlsforlinks("rev", "canonical")
            }
            if (urls.length > 0) {
                await yank(urls[0])
                excmd_fillcmdline.fillcmdline_tmp(3000, "# " + urls[0] + " copied to clipboard.")
                break
            }
        // Trying yankcanon if yankshort failed...
        case "yankcanon":
            urls = await geturlsforlinks("rel", "canonical")
            if (urls.length > 0) {
                await yank(urls[0])
                excmd_fillcmdline.fillcmdline_tmp(3000, "# " + urls[0] + " copied to clipboard.")
                break
            }
        // Trying yank if yankcanon failed...
        case "yank":
            content = content === "" ? (await activeTab()).url : content
            await yank(content)
            excmd_fillcmdline.fillcmdline_tmp(3000, "# " + content + " copied to clipboard.")
            break
        case "yanktitle":
            content = (await activeTab()).title
            await yank(content)
            excmd_fillcmdline.fillcmdline_tmp(3000, "# " + content + " copied to clipboard.")
            break
        case "yankmd":
            content = "[" + (await activeTab()).title + "](" + (await activeTab()).url + ")"
            await yank(content)
            excmd_fillcmdline.fillcmdline_tmp(3000, "# " + content + " copied to clipboard.")
            break
        case "open":
            url = await getclip()
            if (url) {
                open(url)
            }
            break
        case "tabopen":
            url = await getclip()
            if (url) {
                excmd_open.tabopen(url)
            }
            break
        case "xselpaste":
            content = await getclip("selection")
            if (content.length > 0) {
                EditorCmds.insert_text(content)
            }
            break
        default:
            // todo: maybe we should have some common error and error handler
            throw new Error(`[clipboard] unknown excmd: ${excmd}`)
    }
}

// Returns the url of links that have a matching rel.
export async function geturlsforlinks(reltype = "rel", rel: string) {
    const elems = document.querySelectorAll("link[" + reltype + "='" + rel + "']")
    if (elems) return Array.prototype.map.call(elems, x => x.href)
    return []
}
