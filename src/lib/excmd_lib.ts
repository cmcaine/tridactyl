import * as webext from "@src/lib/webext"
import * as messaging from "@src/lib/messaging"
import * as logging from "@src/lib/logging"

const logger = new logging.Logger("excmd")

type ScriptLocation =
    | "content"
    | "background"
    | "commandline"

function getScriptLocation(): ScriptLocation {
    const webext_context = webext.getContext()
    if (webext_context === "background") {
        return "background"
    }
    if (webext_context === "content" || webext_context === "extension") {
        return "content"
    }
}

export function forwardedToBackground<Excmds extends object>(name: messaging.NonTabMessageType, cmds: Excmds): Excmds {
    const location = getScriptLocation()
    logger.debug(`Setting up forwarding for ${name} from ${location} to background`)
    if (location === "background") {
        messaging.addListener(name, messaging.attributeCaller(cmds))
    }

    return new Proxy(cmds, {
        get(target, property: string) {
            const excmd = target[property]
            if (excmd) {
                return (...args) => {
                    if (location === "background") {
                        return excmd(...args)
                    } else {
                        return messaging.message(name, property, args)
                    }
                }
            } else {
                return excmd
            }
        }
    })
}

export function forwardedToContent<Excmds extends object>(name: messaging.TabMessageType, cmds: Excmds): Excmds {
    const location = getScriptLocation()
    logger.debug(`Setting up forwarding for ${name} from ${location} to content`)
    if (location === "content") {
        messaging.addListener(name, messaging.attributeCaller(cmds))
    }

    return new Proxy(cmds, {
        get(target, property: string) {
            const excmd = target[property]
            if (excmd) {
                return (...args) => {
                    if (location === "content") {
                        return excmd(...args)
                    } else if (location === "commandline") {
                        return messaging.messageOwnTab(name, property, args)
                    } else {
                        return messaging.messageActiveTab(name, property, args)
                    }
                }
            } else {
                return excmd
            }
        }
    })
}
