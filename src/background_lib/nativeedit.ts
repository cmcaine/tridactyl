import native from "@src/lib/generated/native"
import * as config from "@src/lib/config"

export async function getBestEditor(): Promise<string> {
    let gui_candidates = []
    let term_emulators = []
    let tui_editors = []
    let last_resorts = []
    if ((await browser.runtime.getPlatformInfo()).os === "mac") {
        gui_candidates = [
            "/Applications/MacVim.app/Contents/bin/mvim -f",
            "/usr/local/bin/vimr --wait --nvim +only",
        ]
        // if anyone knows of any "sensible" terminals that let you send them commands to run,
        // please let us know in issue #451!
        term_emulators = [
            "/Applications/cool-retro-term.app/Contents/MacOS/cool-retro-term -e",
        ]
        last_resorts = ["open -nWt"]
    } else {
        // Tempted to put this behind another config setting: prefergui
        gui_candidates = ["gvim -f"]

        // we generally try to give the terminal the class "tridactyl_editor" so that
        // it can be made floating, e.g in i3:
        // for_window [class="tridactyl_editor"] floating enable border pixel 1
        term_emulators = [
            "st -c tridactyl_editor",
            "xterm -class tridactyl_editor -e",
            "uxterm -class tridactyl_editor -e",
            "urxvt -e",
            "alacritty -e", // alacritty is nice but takes ages to start and doesn't support class
            // Terminator and termite require  -e commands to be in quotes
            'terminator -u -e "%c"',
            'termite --class tridactyl_editor -e "%c"',
            "sakura --class tridactyl_editor -e",
            "lilyterm -e",
            "mlterm -e",
            "roxterm -e",
            "cool-retro-term -e",
            // Gnome-terminal doesn't work consistently, see issue #1035
            // "dbus-launch gnome-terminal --",

            // I wanted to put hyper.js here as a joke but you can't start it running a command,
            // which is a far better joke: a terminal emulator that you can't send commands to.
            // You win this time, web artisans.
        ]
        last_resorts = [
            "emacs",
            "gedit",
            "kate",
            "abiword",
            "sublime",
            "atom -w",
        ]
    }

    tui_editors = ["vim %f", "nvim %f", "nano %f", "emacs -nw %f"]

    // Consider GUI editors
    let cmd = await native.firstinpath(gui_candidates)

    if (cmd === undefined) {
        // Try to find a terminal emulator
        cmd = await native.firstinpath(term_emulators)
        if (cmd !== undefined) {
            // and a text editor
            const tuicmd = await native.firstinpath(tui_editors)
            if (cmd.includes("%c")) {
                cmd = cmd.replace("%c", tuicmd)
            } else {
                cmd = cmd + " " + tuicmd
            }
        } else {
            // or fall back to some really stupid stuff
            cmd = await native.firstinpath(last_resorts)
        }
    }

    return cmd
}

export async function startNativeEdit(file: string, line: number, col: number, content?: string) {
    if (!(await native.nativegate())) {
        return undefined
    }

    if (content !== undefined) await native.write(file, content)
    const editorcmd =
        (config.get("editorcmd") === "auto"
            ? await getBestEditor()
            : config.get("editorcmd"))
        .replace(/%l/, line)
        .replace(/%c/, col)
    let exec
    if (editorcmd.indexOf("%f") !== -1) {
        exec = await native.run(editorcmd.replace(/%f/, file))
    } else {
        exec = await native.run(editorcmd + " " + file)
    }
    if (exec.code != 0) { return exec }
    return native.read(file)
}
