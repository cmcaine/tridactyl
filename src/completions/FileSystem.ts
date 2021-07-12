import * as Completions from "@src/completions"
import * as Native from "@src/lib/native"

class FileSystemCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(public value: string) {
        super()
        this.fuseKeys = [value]
        this.html = html`<tr class="FileSystemCompletionOption option">
            <td class="value">${value}</td>
        </tr>`
    }
}

export class FileSystemCompletionSource extends Completions.CompletionSourceFuse {
    public options: FileSystemCompletionOption[]

    constructor(private _parent) {
        super(
            ["saveas", "source", "js -s", "jsb -s"],
            "FileSystemCompletionSource",
            "FileSystem",
            "FileSystem",
        )

        this._parent.appendChild(this.node)
    }

    public async onInput(exstr) {
        return this.filter(exstr)
    }

    public async filter(exstr: string) {
        if (!exstr || exstr.indexOf(" ") === -1) {
            this.state = "hidden"
            return
        }

        let [cmd, path] = this.splitOnPrefix(exstr)
        if (cmd === undefined) {
            this.state = "hidden"
            return
        }

        if (!path) path = "."

        if (!["/", "$", "~", "."].find(s => path.startsWith(s))) {
            // If the path doesn't start with a special character, it is relative to the native messenger, thus use "." as starting point
            // Does this work on windows?
            path = "./" + path
        }

        // Update lastExstr because we modified the path and scoreOptions uses that in order to assign scores
        this.lastExstr = cmd + path

        let req
        try {
            req = await Native.listDir(path)
        } catch (e) {
            // Failing silently because we can't nativegate (the user is typing stuff in the commandline)
            this.state = "hidden"
            return
        }

        if (req.isDir) {
            if (!path.endsWith(req.sep)) path += req.sep
        } else {
            path = path.substring(0, path.lastIndexOf("/") + 1)
        }

        this.options = req.files.map(
            p => new FileSystemCompletionOption(path + p),
        )

        this.state = "normal"
        return this.updateChain()
    }
}
