import * as CSS from "css"
import * as css_util from "@src/lib/css_util"
import nativelib from "@src/lib/generated/native"

export async function guiset(rule: string, option: string) {
    if (!rule || !option) throw new Error(":guiset requires two arguments. See `:help guiset` for more information.")
    // Could potentially fall back to sending minimal example to clipboard if native not installed

    // Check for native messenger and make sure we have a plausible profile directory
    if (!(await nativelib.nativegate("0.1.1"))) return
    const profile_dir = await nativelib.getProfileDir()

    // Make backups
    await nativelib.mkdir(profile_dir + "/chrome", true)
    let cssstr = (await nativelib.read(profile_dir + "/chrome/userChrome.css")).content
    const cssstrOrig = (await nativelib.read(profile_dir + "/chrome/userChrome.orig.css")).content
    if (cssstrOrig === "") await nativelib.write(profile_dir + "/chrome/userChrome.orig.css", cssstr)
    await nativelib.write(profile_dir + "/chrome/userChrome.css.tri.bak", cssstr)

    // Modify and write new CSS
    if (cssstr === "") cssstr = `@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");`
    const stylesheet = CSS.parse(cssstr)
    // Trim due to https://github.com/reworkcss/css/issues/113
    const stylesheetDone = CSS.stringify(css_util.changeCss(rule, option, stylesheet)).trim()
    return nativelib.write(profile_dir + "/chrome/userChrome.css", stylesheetDone)
}

