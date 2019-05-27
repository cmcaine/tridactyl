import * as Messaging from "@src/lib/messaging"
import * as CommandLineContent from "@src/content/commandline_content"

export async function showcmdline(focus = true) {
    CommandLineContent.show()
    let done = Promise.resolve()
    if (focus) {
        CommandLineContent.focus()
        done = Messaging.messageOwnTab("commandline_frame", "focus")
    }
    return done
}

export async function hidecmdline() {
    CommandLineContent.hide_and_blur()
}

export async function fillcmdline(...strarr: string[]) {
    const str = strarr.join(" ")
    showcmdline()
    return Messaging.messageOwnTab("commandline_frame", "fillcmdline", [str])
}

export async function fillcmdline_notrail(...strarr: string[]) {
    const str = strarr.join(" ")
    showcmdline()
    return Messaging.messageOwnTab("commandline_frame", "fillcmdline", [str, false])
}

export async function fillcmdline_nofocus(...strarr: string[]) {
    showcmdline(false)
    return Messaging.messageOwnTab("commandline_frame", "fillcmdline", [strarr.join(" "), false, false])
}

export async function fillcmdline_tmp(ms: number, ...strarr: string[]) {
    const str = strarr.join(" ")
    showcmdline(false)
    Messaging.messageOwnTab("commandline_frame", "fillcmdline", [strarr.join(" "), false, false])
    return new Promise(resolve =>
        setTimeout(async () => {
            if ((await Messaging.messageOwnTab("commandline_frame", "getContent", [])) === str) {
                CommandLineContent.hide_and_blur()
                resolve(Messaging.messageOwnTab("commandline_frame", "clear", [true]))
            }
            resolve()
        }, ms),
    )
}
