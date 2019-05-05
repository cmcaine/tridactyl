// Interfaces common to the tridactyl project.

// For some obscure reason, tsc doesn't like .d.ts files to share a name with
// .ts files. So don't do that.

// Ill-advised monkeypatching
interface Number {
    mod(n: number): number
    clamp(lo: number, hi: number): number
}

// Firefox-specific dom properties
interface Window {
    scrollByLines(n: number): void
    scrollByPages(n: number): void
    eval(str: string): any
}

// Firefox Document interface
interface Document {
    fullscreenElement: HTMLElement | void
}

// Record that we've added a property with convenience objects to the
// window object:
interface Window {
    tri: any
}

// Again, firefox-specific
interface UIEvent {
    pageX: number
    pageY: number
}

// Autocmd optional arguments
interface AutocmdArgs {
    url?: string
    file?: string
    size?: number
}

// This isn't an actual firefox type but it's nice to have one for this kind of object
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/find/find
interface findResult {
    count: number
    rangeData: {
        framePos: number
        startTextNodePos: number
        endTextNodePos: number
        startOffset: number
        endOffset: number
        text: string
    }[]
    rectData: {
        rectsAndTexts: {
            top: number
            left: number
            bottom: number
            right: number
        }[]
        textList: string[]
    }
}

interface HTMLElement {
    // Let's be future proof:
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus
    focus(options: any): void
    // Let's also implement the current function signature.
    focus(): void
}

declare function exportFunction(
    func: Function,
    targetScope: object,
    options?: { defineAs?: string; allowCrossOriginArguments?: boolean },
): Function

// Fix typescript bugs
interface StringConstructor {
    toLowerCase(): string
}

// Web extension types not in web-ext-types yet
declare namespace browser.find {
    function find(query, object): any
}

// setZoom has an optional first argument of tabId. Unclear how first argument can be optional.
declare namespace browser.tabs {
    function setZoom(zoomFactor: number): Promise<void>
    function setZoom(tabId: number, zoomFactor: number): Promise<void>
    function toggleReaderMode(tabId?: number): Promise<void>
}

// web-ext-browser barely declares a third of the management
// interface, and we can't switch to @types/firefox-webext-browser yet
// because their enums are all messed up (see
// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/28369)
// Instead, we'll copy-paste as much as we need from the fixed branch:
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/d1180e5218a7bf69e6f0da5ac2e2584bd57a1cdf/types/firefox-webext-browser/index.d.ts
interface WebExtEventBase<
    TAddListener extends (...args: any[]) => any,
    TCallback
> {
    addListener: TAddListener

    removeListener(cb: TCallback): void

    hasListener(cb: TCallback): boolean
}
type WebExtEvent<TCallback extends (...args: any[]) => any> = WebExtEventBase<
    (callback: TCallback) => void,
    TCallback
>
declare namespace browser.management {
    /* management types */

    /** Information about an icon belonging to an extension. */
    interface IconInfo {
        /**
         * A number representing the width and height of the icon. Likely values include (but are not limited to) 128,
         * 48, 24, and 16.
         */
        size: number
        /**
         * The URL for this icon image. To display a grayscale version of the icon (to indicate that an extension is
         * disabled, for example), append `?grayscale=true` to the URL.
         */
        url: string
    }

    /** A reason the item is disabled. */
    type ExtensionDisabledReason = "unknown" | "permissions_increase"

    /** The type of this extension. Will always be 'extension'. */
    type ExtensionType = "extension" | "theme"

    /**
     * How the extension was installed. One of
     * `development`: The extension was loaded unpacked in developer mode,
     * `normal`: The extension was installed normally via an .xpi file,
     * `sideload`: The extension was installed by other software on the machine,
     * `other`: The extension was installed by other means.
     */
    type ExtensionInstallType = "development" | "normal" | "sideload" | "other"

    /** Information about an installed extension. */
    interface IExtensionInfo {
        /** The extension's unique identifier. */
        id: string
        /** The name of this extension. */
        name: string
        /** A short version of the name of this extension. */
        shortName?: string
        /** The description of this extension. */
        description: string
        /** The version of this extension. */
        version: string
        /** The version name of this extension if the manifest specified one. */
        versionName?: string
        /** Whether this extension can be disabled or uninstalled by the user. */
        mayDisable: boolean
        /** Whether it is currently enabled or disabled. */
        enabled: boolean
        /** A reason the item is disabled. */
        disabledReason?: ExtensionDisabledReason
        /** The type of this extension. Will always return 'extension'. */
        type: ExtensionType
        /** The URL of the homepage of this extension. */
        homepageUrl?: string
        /** The update URL of this extension. */
        updateUrl?: string
        /** The url for the item's options page, if it has one. */
        optionsUrl: string
        /**
         * A list of icon information. Note that this just reflects what was declared in the manifest, and the actual
         * image at that url may be larger or smaller than what was declared, so you might consider using explicit
         * width and height attributes on img tags referencing these images. See the manifest documentation on icons
         * for more details.
         */
        icons?: IconInfo[]
        /** Returns a list of API based permissions. */
        permissions?: string[]
        /** Returns a list of host based permissions. */
        hostPermissions?: string[]
        /** How the extension was installed. */
        installType: ExtensionInstallType
    }

    /* management functions */
    /** Returns a list of information about installed extensions. */
    function getAll(): Promise<IExtensionInfo[] | undefined>

    /* management events */
    /** Fired when an addon has been disabled. */
    const onDisabled: WebExtEvent<(info: IExtensionInfo) => void>

    /** Fired when an addon has been enabled. */
    const onEnabled: WebExtEvent<(info: IExtensionInfo) => void>

    /** Fired when an addon has been installed. */
    const onInstalled: WebExtEvent<(info: IExtensionInfo) => void>

    /** Fired when an addon has been uninstalled. */
    const onUninstalled: WebExtEvent<(info: IExtensionInfo) => void>
}

/** An interface for the additional object that's supplied in the BlockingResponse callback.

 Details here:
 https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest/onBeforeRequest#details

*/
declare namespace browser.webRequest {
    interface IDetails {
        // frameAncestors: any[]
        frameId: number
        method: string
        originUrl: string
        parentFrameId: number
        proxyInfo?: any
        requestBody?: any
        requestId: string
        tabId: number
        timeStamp: number
        type: ResourceType
        url: string
    }
}

// html-tagged-template.js
declare function html(
    strings: TemplateStringsArray,
    ...values: any[]
): HTMLElement

declare namespace browser.webRequest {
    function filterResponseData(requestId: string): any
}

declare namespace browser.search {
    function search(searchProperties: {query: string, engine?: string, tabId?: number}): never
    function get(): {name: string, isDefault: boolean, alias?: string, faviconURL?: string}[]
}

// Stop typedoc complaining about toBeAll.
declare namespace jest {
    interface Matchers<R> {
        toBeAll: any
    }
}
