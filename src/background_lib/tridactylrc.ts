import * as Logging from "@src/lib/logging"
import * as controller from "@src/lib/controller"
import Native from "@src/lib/generated/native"

const logger = new Logging.Logger("excmds")

async function loadAndRunRcFile(filename = "auto") {
    if (!await Native.nativegate("0.1.3")) {
        throw `Native Messenger 0.1.3 required to source a tridactyl rc from file.`
    }
    const rctext = await getRcFile(filename)
    if (!rctext) {
        return false
    }
    await runRcFile(rctext)
    return true
}

async function getRcFile(filename: string) {
    if (filename === "auto") {
        return await Native.getrc()
    } else {
        return (await Native.read(filename)).content
    }
}

async function runRcFile(rc: string) {
    for (const cmd of rcFileToExCmds(rc)) {
        await controller.acceptExCmd(cmd)
    }
}

function rcFileToExCmds(rcText: string): string[] {
    const excmds = rcText.split("\n")
    // Remove empty and comment lines
    return excmds.filter(x => /\S/.test(x) && !x.trim().startsWith('"'))
}

export async function source(...fileArr: string[]) {
    const file = fileArr.join(" ") || undefined
    if (!await loadAndRunRcFile(file)) {
        logger.error("Could not find RC file")
    }
}

export async function source_quiet(...fileArr: string[]) {
    const file = fileArr.join(" ") || undefined
    try {
        await loadAndRunRcFile(file)
    } catch (e) {
        logger.info("Automatic loading of RC file failed:", e)
    }
}
