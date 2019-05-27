import native from "@src/lib/generated/native"
import * as config from "@src/lib/config"

export async function parsePrefs(prefFileContent: string) {
    //  This RegExp currently only deals with " but for correctness it should
    //  also deal with ' and `
    //  We could also just give up on parsing and eval() the whole thing
    const regex = new RegExp(
        /^(user_|sticky_|lock)?[pP]ref\("([^"]+)",\s*"?([^\)]+?)"?\);$/,
    )
    // Fragile parsing
    return prefFileContent.split("\n").reduce((prefs, line) => {
        const matches = line.match(regex)
        if (!matches) {
            return prefs
        }
        const key = matches[2]
        let value = matches[3]
        // value = " means that it should be an empty string
        if (value === '"') value = ""
        prefs[key] = value
        return prefs
    }, {})
}

/** When given the name of a firefox preference file, will load said file and
 *  return a promise for an object the keys of which correspond to preference
 *  names and the values of which correspond to preference values.
 *  When the file couldn't be loaded or doesn't contain any preferences, will
 *  return a promise for an empty object.
 */
export async function loadPrefs(filename): Promise<{ [key: string]: string }> {
    const result = await native.read(filename)
    if (result.code !== 0) return {}
    return parsePrefs(result.content)
}

let cached_prefs = null

/** Returns a promise for an object that should contain every about:config
 *  setting.
 *
 *  Performance is slow so we cache the results.
 */
export async function getPrefs(): Promise<{ [key: string]: string }> {
    if (cached_prefs !== null) return cached_prefs
    const profile = (await native.getProfileDir()) + "/"
    const prefFiles = [
        // Debian has these
        "/usr/share/firefox/browser/defaults/preferences/firefox.js",
        "/usr/share/firefox/browser/defaults/preferences/debugger.js",
        "/usr/share/firefox/browser/defaults/preferences/devtools-startup-prefs.js",
        "/usr/share/firefox/browser/defaults/preferences/devtools.js",
        "/usr/share/firefox/browser/defaults/preferences/firefox-branding.js",
        "/usr/share/firefox/browser/defaults/preferences/vendor.js",
        "/usr/share/firefox/browser/defaults/preferences/firefox.js",
        "/etc/firefox/firefox.js",
        // Pref files can be found here:
        // https://developer.mozilla.org/en-US/docs/Mozilla/Preferences/A_brief_guide_to_Mozilla_preferences
        profile + "grepref.js",
        profile + "services/common/services-common.js",
        profile + "defaults/pref/services-sync.js",
        profile + "browser/app/profile/channel-prefs.js",
        profile + "browser/app/profile/firefox.js",
        profile + "browser/app/profile/firefox-branding.js",
        profile + "browser/defaults/preferences/firefox-l10n.js",
        profile + "prefs.js",
        profile + "user.js",
    ]
    const promises = []
    // Starting all promises before awaiting because we want the calls to be
    // made in parallel
    for (const file of prefFiles) {
        promises.push(loadPrefs(file))
    }
    cached_prefs = promises.reduce(async (a, b) =>
        Object.assign(await a, await b),
    )
    return cached_prefs
}

/** Returns the value for the corresponding about:config setting */
export async function getPref(name: string): Promise<string> {
    return (await getPrefs())[name]
}

/** Fetches a config option from the config. If the option is undefined, fetch
 *  a preference from preferences. It would make more sense for this function to
 *  be in config.ts but this would require importing this file in config.ts and
 *  Webpack doesn't like circular dependencies.
 */
export async function getConfElsePref(
    confName: string,
    prefName: string,
): Promise<any> {
    let option = await config.getAsync(confName)
    if (option === undefined) {
        try {
            option = await getPref(prefName)
        } catch (e) {}
    }
    return option
}

/** Fetches a config option from the config. If the option is
 *  undefined, fetch prefName from the preferences. If prefName is
 *  undefined too, return a default.
 */
export async function getConfElsePrefElseDefault(
    confName: string,
    prefName: string,
    def: any,
): Promise<any> {
    const option = await getConfElsePref(confName, prefName)
    if (option === undefined) return def
    return option
}

/** Writes a preference to user.js */
export async function writePref(name: string, value: any) {
    if (cached_prefs) cached_prefs[name] = value

    const file = (await native.getProfileDir()) + "/user.js"
    // No need to check the return code because read returns "" when failing to
    // read a file
    const text = (await native.read(file)).content
    const prefPos = text.indexOf(`pref("${name}",`)
    if (prefPos < 0) {
        native.write(file, `${text}\nuser_pref("${name}", ${value});\n`)
    } else {
        let substr = text.substring(prefPos)
        const prefEnd = substr.indexOf(";\n")
        substr = text.substring(prefPos, prefPos + prefEnd)
        native.write(file, text.replace(substr, `pref("${name}", ${value})`))
    }
}

export async function writeAMOPermissions() {
    await writePref("privacy.resistFingerprinting.block_mozAddonManager", "true")
    await writePref("extensions.webextensions.restrictedDomains", '""')
}
