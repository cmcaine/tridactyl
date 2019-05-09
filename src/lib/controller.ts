import Logger from "@src/lib/logging"
import { parser as exmode_parser } from "@src/parsers/exmode"

const logger = new Logger("controller")

export class ExcmdAcceptor {
    private last_ex_str: string = ""

    constructor(
        // This should really be something like this:
        //
        //   readonly excmds: { [ns: string]: { [excmd: string]: (...any) => any } },
        //
        // But excmds.ts still has a ton of variables and stuff in it,
        // so we can't do that and have to leave it as `any`.
        readonly excmds: { [ns: string]: { [excmd: string]: any } },
    ) {}

    async acceptExCmd(exstr: string): Promise<any> {
        // TODO: Errors should go to CommandLine.
        try {
            const [func, args] = exmode_parser(exstr, this.excmds)
            // Stop the repeat excmd from recursing.
            if (func !== this.excmds.repeat) this.last_ex_str = exstr
            try {
                return await func(...args)
            } catch (e) {
                // Errors from func are caught here (e.g. no next tab)
                logger.error("controller in excmd: ", e)
            }
        } catch (e) {
            // Errors from parser caught here
            logger.error("controller while accepting: ", e)
        }
    }

    repeat(n = 1, ...exstr: string[]) {
        let cmd = this.last_ex_str
        if (exstr.length > 0) cmd = exstr.join(" ")
        logger.debug("repeating " + cmd + " " + n + " times")
        for (let i = 0; i < n; i++) {
            this.acceptExCmd(cmd)
        }
    }
}

// TODO: Propagate the excmdAccepter far enough down that we can get
// rid of these globals
export let root_accepter: ExcmdAcceptor
export function setExCmds(excmds: any) {
    root_accepter = new ExcmdAcceptor(excmds)
}
export function setGlobalAccepter(new_accepter: ExcmdAcceptor) {
    root_accepter = new_accepter
}
export async function acceptExCmd(exstr: string) {
    root_accepter.acceptExCmd(exstr)
}
export async function repeat(n, ...exstr: string[]) {
    root_accepter.repeat(n, ...exstr)
}
