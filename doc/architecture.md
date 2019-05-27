# Architecture

## Outline

A broad outline is thus:

1.  A user presses a key, triggering a keyEvent
2.  The parser picker chooses which parser to send it to based on the current mode
3.  The mode parser adds the key to its internal state, and can call an `update()` function to update, e.g, the status line / autocompletion
4.  Upon receiving a terminal character, the parser translates the series of keypresses into an `ex` string (e.g, ":scrollPage 1")
5.  This `ex` string is sent to the `ex str` parser, and converted into an internal Tridactyl function, e.g. `commmands.scrollPage(1)`, or if not possible, we report an error to the user
6.  These functions then interface with the WebExtensions API and will hide any message passing that needs to occur. If the function fails, it reports an error as in step 5.

        browser -> keyEvents -> parser picker -> mode parser -> terminal character -> ex command -> "ex str" parser -> (function | error) -> browser

The process for "BrowserEvents", which occur when the user or some other code manipulates the browser through some non-Tridactyl method is similar, but we skip the parser picker step for now.

Examples of BrowserEvents include the user scrolling with the scrollbar or mousewheel, changing the page by clicking a link, and page redirection by someone else's javascript.

    browser -> BrowserEvents -> browser parser -> "ex str" -> (function | error) -> browser

At this point, it is assumed that the parsers will live in background scripts, and we will use some form of keyboard API to intercept keyEvents, but the same architecture can be used with a content script listening for key events and passing them into the background scripts.

## State

Wherever possible, functions are pure, or as pure as they can be. Where we need to store or retrieve state, we prefer interacting with the browser's state rather than storing our own. Where that is not possible, we prefer storing state in a `state` namespace if more than one function needs to access it and somehow attached to the function if not. We anticipate storing the current mode, tables of maps and commands, search history and command history in this namespace.

Command history will be synchronised using the storage API. We anticipate storing the maps using the same API, but only on request (e.g, `:mktridactylrc`)

## Code Generation and messaging wrappers

Some functionality runs in the content script, for example, changing the mode which is local to each tab. Some functionality runs in the background script, for example, opening a new tab which requires the `browser.tabs` API which only the background script can access. We don't want to be hand-rolling cross-context messaging for every function in Tridactyl, so we implement some functionality for forwarding invocations of some modules between contexts. To make this easier on Typescript's compiler, we currently handle this by generating wrapper code.

Each module in `src/content_lib` and `src/background_lib` will have an identically-named wrapper generated for it in `src/lib`. That wrapper looks at the context it's being invoked from and sends an RPC to the appropriate context using the functions in `src/lib/messaging.ts`; for example, invoking a content-only function will use `messageActiveTab` if invoked in the background but `messageOwnTab` if invoked from the commandline iframe.

## The rest

{{Links to the litcoffee for each concept here. Architecture specific to them will be discussed there.}}
