import * as semverCompare from "semver-compare"
import * as config from "@src/lib/config"
import Logger from "@src/lib/logging"
import excmd_fillcmdline from "@src/lib/generated/fillcmdline"
import excmd_windows from "@src/lib/generated/windows"
import * as webext from "@src/lib/webext"


const logger = new Logger("native")

const NATIVE_NAME = "tridactyl"

type MessageCommand =
    | "version"
    | "run"
    | "read"
    | "write"
    | "temp"
    | "list_dir"
    | "mkdir"
    | "move"
    | "eval"
    | "getconfig"
    | "getconfigpath"
    | "env"
    | "win_firefox_restart"

interface MessageResp {
    cmd: string
    version: number | null
    content: string | null
    code: number | null
    error: string | null
}

/**
 * Posts using the one-time message API; native is killed after
 * message returns. This is the core primitive for interacting with
 * the native messenger: *everything* goes through this.
 */
async function sendNativeMsg(
    cmd: MessageCommand,
    opts: object,
    quiet = false,
): Promise<MessageResp> {
    const send = Object.assign({ cmd }, opts)
    let resp
    logger.info(`Sending message: ${JSON.stringify(send)}`)

    try {
        resp = await browser.runtime.sendNativeMessage(NATIVE_NAME, send)
        logger.info(`Received response:`, resp)
        return resp as MessageResp
    } catch (e) {
        if (!quiet) {
            throw new Error(
                "Failed to send message to native messenger. If it is correctly installed (run `:native`), please report this bug on https://github.com/tridactyl/tridactyl/issues .",
            )
        }
    }
}

// #############################################################################
// Low-level operations: Read and write files, get version numbers,
// etcetera. Each of these more or less corresponds to a single native
// message type.

let CACHED_NATIVE_VERSION

export async function getNativeMessengerVersion(
    quiet = false,
): Promise<number> {
    if (!CACHED_NATIVE_VERSION) {
        const res = await sendNativeMsg("version", {}, quiet)
        if (!res || res.error || res.code !== 0 || !res.version) {
            return
        }
        CACHED_NATIVE_VERSION = res.version
    }
    logger.info(`Native version: ${CACHED_NATIVE_VERSION}`)
    return CACHED_NATIVE_VERSION
}

/**
 * Used internally to gate off functions that use the native messenger. Gives a
 * helpful error message in the command line if the native messenger is not
 * installed, or is the wrong version.
 *
 * @arg version: A string representing the minimal required version.
 * @arg interactive: True if a message should be displayed on version mismatch.
 * @return false if the required version is higher than the currently available
 * native messenger version.
 */
export async function nativegate(
    version = "0",
    interactive = true,
    desiredOS = ["mac", "win", "linux", "openbsd"],
    // desiredOS = ["mac", "win", "android", "cros", "linux", "openbsd"],
): Promise<boolean> {
    if (!desiredOS.includes((await browser.runtime.getPlatformInfo()).os)) {
        if (interactive) {
            logger.error(
                "# Tridactyl's native messenger doesn't support your operating system, yet.",
            )
        }
        return false
    }
    try {
        const actualVersion = await getNativeMessengerVersion()
        if (actualVersion !== undefined) {
            if (semverCompare(version, actualVersion) > 0) {
                if (interactive)
                    logger.error([
                        `# This feature requires native messenger`,
                        `version ${version}. Please update, for example by`,
                        "running `:updatenative`."].join(" "))
                // TODO: add update procedure and document here.
                return false
            }
            return true
        } else if (interactive) {
            logger.error(
                "# Native messenger not found. Please run `:installnative` and follow the instructions.",
            )
            return false
        }
    } catch (e) {
        if (interactive)
            logger.error(
                "# Native messenger not found. Please run `:installnative` and follow the instructions.",
            )
        return false
    }
}

export async function getrcpath(): Promise<string> {
    const res = await sendNativeMsg("getconfigpath", {})
    if (res.code !== 0) throw new Error("getrcpath error: " + res.code)
    return res.content
}

export async function getrc(): Promise<string> {
    const res = await sendNativeMsg("getconfig", {})

    if (res.content && !res.error) {
        logger.info(`Successfully retrieved fs config:\n${res.content}`)
        return res.content
    } else {
        // Have to make this a warning as async exceptions apparently don't get caught
        logger.info(`Error in retrieving config: ${res.error}`)
    }
}

export async function read(file: string) {
    try {
        return await sendNativeMsg("read", { file })
    } catch(e) {
        throw `Failed to read ${file}. ${e}`
    }
}

export async function write(file: string, content: string) {
    try {
        return await sendNativeMsg("write", { file, content })
    } catch (e) {
        throw `Failed to write '${content}' to '${file}'. ${e}`
    }
}

export async function mkdir(dir: string, exist_ok: boolean) {
    try {
        return sendNativeMsg("mkdir", { dir, exist_ok })
    } catch(e) {
        throw `Failed to create directory '${dir}'. ${e}`
    }
}

export async function temp(content: string, prefix: string) {
    try {
        return sendNativeMsg("temp", { content, prefix })
    } catch(e) {
        throw `Failed to write '${content}' to temp file '${prefix}'. ${e}`
    }
}

export async function move(from: string, to: string) {
    try {
        return sendNativeMsg("move", { from, to })
    } catch(e) {
        throw `Failed to move '${from}' to '${to}'. ${e}.`
    }
}

export async function listDir(dir: string) {
    try {
        return sendNativeMsg("list_dir", { path: dir })
    } catch(e) {
        throw `Failed to read directory '${dir}'. ${e}`
    }
}

export async function run(command: string, content = "") {
    try {
        const msg = await sendNativeMsg("run", { command, content })
        logger.info(msg)
        return msg
    } catch(e) {
        throw `Failed to run native command '${command}'`
    }
}

/** Evaluates a string in the native messenger. This has to be python code. If
 *  you want to run shell strings, use run() instead.
 */
export async function pyeval(command: string): Promise<MessageResp> {
    return sendNativeMsg("eval", { command })
}

export async function getEnvironmentVariables(variable: string) {
    const required_version = "0.1.2"

    if (!(await nativegate(required_version, false))) {
        throw `'getEnvironmentVariables' needs native messenger version >= ${required_version}.`
    }

    return (await sendNativeMsg("env", { var: variable })).content
}

// #############################################################################
// Higher-level operations.

async function inpath(cmd) {
    const pathcmd =
        (await browser.runtime.getPlatformInfo()).os === "win"
            ? "where "
            : "which "
    return (await run(pathcmd + cmd.split(" ")[0])).code === 0
}

/**
 * Given a list of executables, looks them up in the native
 * messenger's PATH and return the first one that's available for
 * execution.
 */
export async function firstinpath(cmdarray) {
    let ind = 0
    let cmd = cmdarray[ind]
    // Try to find a text editor
    while (!(await inpath(cmd.split(" ")[0]))) {
        ind++
        cmd = cmdarray[ind]
        if (cmd === undefined) break
    }
    return cmd
}

export async function getFirefoxDir() {
    switch ((await browser.runtime.getPlatformInfo()).os) {
        case "win":
            return getEnvironmentVariables("APPDATA").then(path => path + "\\Mozilla\\Firefox\\")
        case "mac":
            return getEnvironmentVariables("HOME").then(
                path => path + "/Library/Application Support/Firefox/",
            )
        default:
            return getEnvironmentVariables("HOME").then(path => path + "/.mozilla/firefox/")
    }
}

export async function getProfileUncached() {
    const ffDir = await getFirefoxDir()
    const iniPath = ffDir + "profiles.ini"
    let iniObject = {}
    let iniSucceeded = false
    const iniContent = await read(iniPath)
    if (iniContent.code === 0 && iniContent.content.length > 0) {
        try {
            iniObject = await parseProfilesIni(iniContent.content, ffDir)
            iniSucceeded = true
        } catch (e) {}
    }
    const curProfileDir = config.get("profiledir")

    // First, try to see if the 'profiledir' setting matches a profile in profile.ini
    if (curProfileDir !== "auto") {
        if (iniSucceeded) {
            for (const profileName of Object.keys(iniObject)) {
                const profile = iniObject[profileName]
                if (profile.absolutePath === curProfileDir) {
                    return profile
                }
            }
        }
        return {
            Name: undefined,
            IsRelative: "0",
            Path: curProfileDir,
            relativePath: undefined,
            absolutePath: curProfileDir,
        }
    }

    // Then, try to find a profile path in the arguments given to Firefox
    const cmdline = await getFirefoxInvocation().catch(e => "")
    let profile = cmdline.indexOf("--profile")
    if (profile === -1)
        profile = cmdline.indexOf("-profile")
    if (profile >= 0 && profile < cmdline.length - 1) {
        const profilePath = cmdline[profile + 1]
        if (iniSucceeded) {
            for (const profileName of Object.keys(iniObject)) {
                const profile = iniObject[profileName]
                if (profile.absolutePath === profilePath) {
                    return profile
                }
            }
        }
        // We're running in a profile that isn't stored in profiles.ini
        // Let's fill in the default info profile.ini profiles have anyway
        return {
            Name: undefined,
            IsRelative: "0",
            Path: profilePath,
            relativePath: undefined,
            absolutePath: profilePath,
        }
    }

    if (iniSucceeded) {
        // Try to find a profile name in firefox's arguments
        let p = cmdline.indexOf("-p")
        if (p === -1) p = cmdline.indexOf("-P")
        if (p >= 0 && p < cmdline.length - 1) {
            const pName = cmdline[p + 1]
            for (const profileName of Object.keys(iniObject)) {
                const profile = iniObject[profileName]
                if (profile.Name === pName) {
                    return profile
                }
            }
            throw new Error(
                `native.ts:getProfile() : '${
                    cmdline[p]
                }' found in command line arguments but no matching profile name found in "${iniPath}"`,
            )
        }
    }

    // Still nothing, try to find a profile in use
    let hacky_profile_finder = `find "${ffDir}" -maxdepth 2 -name lock`
    if ((await browser.runtime.getPlatformInfo()).os === "mac")
        hacky_profile_finder = `find "${ffDir}" -maxdepth 2 -name .parentlock`
    const profilecmd = await run(hacky_profile_finder)
    if (profilecmd.code === 0 && profilecmd.content.length !== 0) {
        // Remove trailing newline
        profilecmd.content = profilecmd.content.trim()
        // If there's only one profile in use, use that to find the right profile
        if (profilecmd.content.split("\n").length === 1) {
            const path = profilecmd.content
                .split("/")
                .slice(0, -1)
                .join("/")
            if (iniSucceeded) {
                for (const profileName of Object.keys(iniObject)) {
                    const profile = iniObject[profileName]
                    if (profile.absolutePath === path) {
                        return profile
                    }
                }
            }
            return {
                Name: undefined,
                IsRelative: "0",
                Path: path,
                relativePath: undefined,
                absolutePath: path,
            }
        }
    }

    if (iniSucceeded) {
        // Multiple profiles used but no -p or --profile, this means that we're using the default profile
        for (const profileName of Object.keys(iniObject)) {
            const profile = iniObject[profileName]
            if (profile.Default === 1 || profile.Default === "1") {
                return profile
            }
        }
    }

    throw new Error(
        `Couldn't deduce which profile you want. See ':help profiledir'`,
    )
}

// Disk operations are extremely slow on windows, let's cache our profile info
let cachedProfile
export async function getProfile() {
    if (cachedProfile === undefined)
        cachedProfile = await getProfileUncached()
    return cachedProfile
}
// It makes sense to pre-fetch this value in the background script because it's
// long-lived. Other contexts are created and destroyed all the time so we
// don't want to pre-fetch in these.
if (webext.getContext() === "background") {
    getProfile()
}
config.addChangeListener("profiledir", (prev, cur) => {
    cachedProfile = undefined
    getProfile()
})

async function parseProfilesIni(content: string, basePath: string) {
    const lines = content.split("\n")
    let current = "General"
    const result = {}
    for (const line of lines) {
        let match = line.match(/^\[([^\]]+)\]$/)
        if (match !== null) {
            current = match[1]
            result[current] = {}
        } else {
            match = line.match(/^([^=]+)=([^=]+)$/)
            if (match !== null) {
                result[current][match[1]] = match[2]
            }
        }
    }
    for (const profileName of Object.keys(result)) {
        const profile = result[profileName]
        // New profiles.ini have a useless section at the top
        if (profile.Path == undefined) {
            delete result[profileName]
            continue
        }
        // On windows, profiles.ini paths will be expressed with `/`, but we're
        // on windows, so we need `\`
        if ((await browser.runtime.getPlatformInfo()).os === "win") {
            profile.Path = profile.Path.replace("/", "\\")
        }
        // profile.IsRelative can be 0, 1 or undefined
        if (profile.IsRelative === "1") {
            profile.relativePath = profile.Path
            profile.absolutePath = basePath + profile.relativePath
        } else if (profile.IsRelative === "0") {
            if (profile.Path.substring(0, basePath.length) !== basePath) {
                throw new Error(
                    `Error parsing profiles ini: basePath "${basePath}" doesn't match profile path ${
                        profile.Path
                    }`,
                )
            }
            profile.relativePath = profile.Path.substring(basePath.length)
            profile.absolutePath = profile.Path
        }
    }
    return result
}

export async function getProfileDir() {
    const profiledir = config.get("profiledir")
    if (profiledir === "auto") {
        return (await getProfile()).absolutePath
    } else {
        return profiledir
    }
}

export async function getProfileName() {
    return (await getProfile()).Name
}

/** This returns the commandline that was used to start firefox.
    You'll get both firefox binary (not necessarily an absolute path) and flags */
async function getFirefoxInvocation(): Promise<string[]> {
    if ((await browser.runtime.getPlatformInfo()).os === "win") {
        throw ['Error: "getFirefoxInvocation() is currently',
               'broken on Windows and should be avoided."'].join(" ")
    }
    const output = await pyeval(
        'handleMessage({"cmd": "run", ' +
            '"command": "ps -p " + str(os.getppid()) + " -oargs="})["content"]',
    )
    return output.content.trim().split(" ")
}

export async function restartFirefox() {
    if (!await nativegate("0", true)) { return }

    const profiledir = await getProfileDir()
    const browsercmd = await config.get("browser")
    const restartScheduled = await scheduleFirefoxRestart(profiledir, browsercmd)

    if (Number(restartScheduled.code) === 0) {
        logger.warning("Restart successfully scheduled, closing Firefox")
        excmd_fillcmdline.fillcmdline("#" + restartScheduled.content)
        excmd_windows.closeAllWindows()
    } else {
        excmd_fillcmdline.fillcmdline("#" + restartScheduled.error)
    }
}

/**
 * Uses the native messenger to set things up to restart Firefox after
 * it closes. On linux and osx this creates a background process which
 * waits for the lock file in the user's profile directory to
 * disappear. Windows has trouble going into the background like this,
 * so instead a new invocation of firefox will be scheduled for a
 * short fixed duration in the future.
 *
 * @return Boolean, true if the restart was successfully scheduled,
 *         false otherwise.
 */
export async function scheduleFirefoxRestart(
    profiledir: string,
    browsercmd: string,
) {
    if ((await browser.runtime.getPlatformInfo()).os === "win") {
        const required_version = "0.1.6"
        if (!(await nativegate(required_version, false))) {
            throw `'restart' on Windows needs native messenger version >= ${required_version}.`
        }
        return sendNativeMsg("win_firefox_restart", { profiledir, browsercmd })
    } else {
        const firefox = (await getFirefoxInvocation()).join(" ")
        // Wait for the lock to disappear, then wait a bit more, then start firefox
        return run(`while readlink ${profiledir}/lock ; do sleep 1 ; done ; sleep 1 ; ${firefox}`)
    }
}

export async function updateNativeMessenger(interactive = true) {
    if (!await nativegate("0", interactive)) { return }

    switch ((await browser.runtime.getPlatformInfo()).os) {
        case "mac":
            if (interactive) {
                logger.error("Updating the native messenger on OSX is broken. Please use `:installnative` instead.")
            }
            return
        case "win":
            await run(await config.get("win_nativeinstallcmd"))
            break
        default:
            await run(await config.get("nativeinstallcmd"))
            break
    }

    if (interactive) {
        return checkNativeVersion()
    }
}

export async function checkNativeVersion() {
    const version = await getNativeMessengerVersion(true)
    if (version !== undefined) {
        excmd_fillcmdline.fillcmdline("# Native messenger is correctly installed, version " + version)
    } else {
        excmd_fillcmdline.fillcmdline("# Native messenger not found. Please run `:installnative` and follow the instructions.")
    }
}

