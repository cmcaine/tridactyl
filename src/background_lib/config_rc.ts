import * as controller from "@src/lib/controller"
import * as Native from "@src/lib/native"

export async function source(filename = "auto") {
    let rctext = ""
    if (filename === "auto") {
        rctext = await Native.getrc()
    } else {
        rctext = (await Native.read(filename)).content
    }
    if (rctext === undefined) return false
    await runRc(rctext)
    return true
}

export async function writeRc(conf: string, force = false, filename = "auto") {
    let path: string
    if (filename === "auto") {
        path = await Native.getrcpath()
    } else {
        path = filename
    }
    return await Native.writerc(path, force, conf)
}

export async function runRc(rc: string) {
    for (const cmd of rcFileToExCmds(rc)) {
        await controller.acceptExCmd(cmd)
    }
}

export function rcFileToExCmds(rcText: string): string[] {
    const excmds = rcText.split("\n")

    // Remove empty and comment lines
    return excmds.filter(x => /\S/.test(x) && !x.trim().startsWith('"'))
}
