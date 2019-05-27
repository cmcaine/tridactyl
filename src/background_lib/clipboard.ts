import Native from "@src/lib/generated/native"
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
    const s = () => setClipboardContents(str)
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
        return getClipboardContents()
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

export async function getClipboardCommand() {
    const clipcmd = await config.get("externalclipboardcmd")
    if (clipcmd === "auto") {
        return Native.firstinpath(["xsel", "xclip"])
    } else if (clipcmd === undefined) {
        throw new Error("Couldn't find an external clipboard executable")
    } else {
        return clipcmd
    }
}

async function setClipboardPost17(contents: string) {
    // If we have a high enough version, we communicate with the
    // native messenger using structured messages and can continue
    // without any escaping mumbo-jumbo.
    const clipcmd = getClipboardCommand()
    return Native.run(`${clipcmd} -i`, contents)
}

async function setClipboardPre17(contents: string) {
    // Older versions of the native messenger don't support structured
    // messages, so we have to use a hacky old fashioned way of escaping
    // the clipboard contents.
    //
    // We're going to pretend that we don't know about stdin, and we
    // need to insert str, which we can't trust, into the clipcmd.
    //
    // In order to do this safely we'll use here documents:
    // http://pubs.opengroup.org/onlinepubs/009695399/utilities/xcu_chap02.html#tag_02_07_04
    const clipcmd = getClipboardCommand()

    // Find a delimiter that isn't in str
    let heredoc = "TRIDACTYL"
    while (contents.search(heredoc) !== -1)
        heredoc += Math.round(Math.random() * 10)

    // Use delimiter to insert str into clipcmd's stdin. Use sed to
    // remove the newline added by the here document
    const invocation = `sed -z 's/.$//' <<'${heredoc}' | ${clipcmd} -i \n${contents}\n${heredoc}`
    return Native.run(invocation)
}

/**
 *
 * Calls an external program to set the contents of the clipboard. We
 * have this in addition to the clipboard handling in
 * commandline_content because the web clipboard APIs can't do
 * anything with the X selection.
 *
 */
export async function setClipboardContents(contents: string) {
    let runResult
    if (await Native.nativegate("0.1.7", false)) {
        runResult = await setClipboardPost17(contents)
    } else {
        runResult = await setClipboardPre17(contents)
    }
    if (runResult.code !== 0) {
        throw new Error(
            `External command failed with code ${runResult.code}: ${runResult.cmd}`,
        )
    }
}

/**
 *
 * Calls an external program to get the contents of the clipboard. We
 * have this in addition to the clipboard handling in
 * commandline_content because the web clipboard APIs can't do
 * anything with the X selection.
 *
 */
export async function getClipboardContents() {
    const clipcmd = getClipboardCommand()
    const result = await Native.run(clipcmd + " -o")
    if (result.code !== 0) {
        throw new Error(
            `External command failed with code ${result.code}: ${result.cmd}`,
        )
    }
    return result.content
}
