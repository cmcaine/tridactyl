import { browserBg, activeTabId, ownTabId, getContext } from "@src/lib/webext"
import Logger from "@src/lib/logging"
import * as AutoLibWrapper from "@src/lib/.auto_lib_wrapper_names.generated.ts"
const logger = new Logger("messaging")

export type TabMessageType =
    | AutoLibWrapper.AutoLibForwardingToContent
    | AutoLibWrapper.AutoLibForwardingToCommandline
    | "editorfn_content"
    | "excmd_content"
    | "controller_content"
    | "commandline_content"
    | "finding_content"
    | "commandline_cmd"
    | "commandline_frame"
    | "content_excmds/fillcmdline"
    | "content_excmds/rss"
export type NonTabMessageType =
    | AutoLibWrapper.AutoLibForwardingToBackground
    | "owntab_background"
    | "excmd_background"
    | "controller_background"
    | "browser_proxy_background"
    | "download_background"
    | "performance_background"
    | "background_excmds/clipboard"
    | "background_excmds/open"
    | "background_excmds/tabs"
export type MessageType = TabMessageType | NonTabMessageType

export interface Message {
    type: MessageType
    // and other unknown attributes...
    [key: string]: any
}

export type listener = (
    message: Message,
    sender?,
    sendResponse?,
) => void | Promise<any>

// Calls methods on obj that match .command and sends responses back
export function attributeCaller(obj) {
    function handler(message: Message, sender, sendResponse) {
        logger.debug(message)

        // Args may be undefined, but you can't spread undefined...
        if (message.args === undefined) message.args = []

        // Call command on obj
        try {
            const response = obj[message.command](...message.args)

            // Return response to sender
            if (response instanceof Promise) {
                logger.debug("Returning promise...", response)
                sendResponse(response)
                // Docs say you should be able to return a promise, but that
                // doesn't work.
                /* return response */
            } else if (response !== undefined) {
                logger.debug("Returning synchronously...", response)
                sendResponse(response)
            }
        } catch (e) {
            logger.error(
                `Error processing ${message.command}(${message.args})`,
                e,
            )
            return Promise.reject(e)
        }
    }
    return handler
}

/** Send a message to non-content scripts */
export async function message(type: NonTabMessageType, command, args?) {
    return browser.runtime.sendMessage({ type, command, args } as Message)
}

/** Message the active tab of the currentWindow */
export async function messageActiveTab(
    type: TabMessageType,
    command: string,
    args?: any[],
) {
    return messageTab(await activeTabId(), type, command, args)
}

export async function messageTab(tabId, type: TabMessageType, command, args?) {
    const message: Message = {
        type,
        command,
        args,
    }
    return browserBg.tabs.sendMessage(tabId, message)
}

let _ownTabId
export async function messageOwnTab(type: TabMessageType, command, args?) {
    if (_ownTabId === undefined) {
        _ownTabId = await ownTabId()
    }
    if (_ownTabId === undefined)
        throw new Error("Can't message own tab: _ownTabId is undefined")
    return messageTab(_ownTabId, type, command, args)
}

export async function messageAllTabs(
    type: TabMessageType,
    command: string,
    args?: any[],
) {
    const responses = []
    for (const tab of await browserBg.tabs.query({})) {
        try {
            responses.push(await messageTab(tab.id, type, command, args))
        } catch (e) {
            logger.error(e)
        }
    }
    return responses
}

const listeners = new Map<string, Set<listener>>()

/** Register a listener to be called for each message with type */
export function addListener(type: MessageType, callback: listener) {
    if (!listeners.get(type)) {
        listeners.set(type, new Set())
    }
    listeners.get(type).add(callback)
    return () => {
        listeners.get(type).delete(callback)
    }
}

// Add a function to the background that content scripts can use to
// obtain the browser.tabs.Tab object for the tab they're in.
if (getContext() === "background") {
    // Warning: lib/webext.ts:ownTab() relies on this listener being added in order to work
    addListener("owntab_background", (message, sender, sendResponse) => {
        const x = Object.assign(Object.create(null), sender.tab)
        x.mutedInfo = Object.assign(Object.create(null), sender.tab.mutedInfo)
        x.sharingState = Object.assign(
            Object.create(null),
            sender.tab.sharingState,
        )
        sendResponse(Promise.resolve(x))
    })
}

/** Recv a message from runtime.onMessage and send to all listeners */
function onMessage(message, sender, sendResponse) {
    if (listeners.get(message.type)) {
        for (const listener of listeners.get(message.type)) {
            listener(message, sender, sendResponse)
        }
    }
}

browser.runtime.onMessage.addListener(onMessage)
