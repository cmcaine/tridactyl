**Control your browser with your keyboard _only_.**

Replace Firefox's control mechanism with one modelled on VIM. This is a "Firefox Quantum" replacement for VimFX, Vimperator and Pentadactyl. Most common tasks you want your browser to perform are bound to a single key press:

-   You want to open a new tab? Hit `t`.
-   You want to follow that link? Hit `f` and type the displayed label. (Note: hint characters should be typed in lowercase.)
-   You want to go to the bottom of the page? Hit `G`. Or the top? `gg`.
-   You want to focus the text field on Wikipedia to search for another term? `gi`.
-   Switch to the next tab? `gt`.
-   Got trapped in a place where Tridactyl can't run? `Ctrl-,`
-   Go back in time? `H`.
-   Notice that this tab is rubbish and you want to close it? `d`.
-   Regret that decision? `u` restores it.
-   Want to write something in Vim? `Ctrl-i` in a text box opens it in Vim, if you have `:native` working.
-   Temporarily disable all that magic because you can't stand it? `Shift-Insert` or `Ctrl-Alt-Escape`.
-   But how do you use your browser now? `Shift-Insert` or `Ctrl-Alt-Escape` again and we're back on.

The list could go on a bit here, but I guess you'll get the point. If you feel lost sometimes `:help` might help you a lot, and there's always `:tutor`.

**Highlighted features:**

-   Follow any link on the site with just 2-3 key presses.
-   Switch to any open tab by searching for its URL or title or entering its ID.
-   Easy customizable search settings.
-   Bind any supported command or commands to the key (sequence) of your liking.
-   Great default bindings (if you're used to Pentadactyl or Vimperator).

This add-on is very usable, but is in an early stage of development. We intend to implement the majority of Vimperator's features.

You can get beta builds from [our website][betas].

**Permissions:**

Since Tridactyl aims to provide all the features Vimperator and Pentadactyl had, it requires quite a few permissions. Here we describe the specific permissions and why we need them.

-   Access your data for all websites:
    -   This is Mozilla's way of saying that Tridactyl can read the content of web pages. This is necessary in order to e.g. find the links you can follow with the `:hint` command (bound to `f` by default).
-   Exchange messages with programs other than Firefox:
    -   This permission is required for Tridactyl to interact with your operating system (opening your editor to edit text areas, sending links to your video player, reading a configuration file from your disk...). This is possible thanks to an external executable we provide. If you feel this gives Tridactyl too much power you can chose not to install the external executable: Tridactyl will still work but won't be able to start external programs.
-   Read and modify bookmarks:
    -   Tridactyl's command line has a powerful autocompletion mechanism. In order to be able to autocomplete your bookmarks, Tridactyl needs to read them.
-   Clear recent browsing history, cookies, and related data:
    -   Tridactyl implements the `:sanitise` command Vimperator and Pentadactyl had. It works a bit like the "Clear All History" dialog you can access by pressing `Ctrl+Shift+Del` on default Firefox.
-   Get data from the clipboard:
    -   If your clipboard contains a URL, pressing `p` will make Tridactyl follow this URL in the current tab.
-   Input data to the clipboard:
    -   Tridactyl lets you copy various elements to the clipboard such as a page's URL with `yy`, a link's URL with `;y` or the content of an HTML element with `;p`.
-   Download files and read and modify the browser's download history:
    -   By pressing `;s`, `;S`, `;a` and `;A` you can save documents and pictures from a page to your download folder.
-   Access browsing history:
    -   The URLs of websites you've visited previously can be suggested as arguments for `:tabopen` and similar commands.
-   Access recently closed tabs:
    -   If you've accidentally closed a tab or window, Tridactyl will let you open it again with the `:undo` command which is bound to `u` by default.
-   Access browser tabs:
    -   Tridactyl provides a quick tab-switching menu/command with the `:buffer` command (bound to `b`). This permission is also required to close, move, and pin tabs, amongst other things.
-   Access browser activity during navigation:
    -   This is needed for Tridactyl to be able to go back to normal mode every time you open a new page. In the future we may use it for autocommands.
-   Read the text of all open tabs:
    -   This allows us to use Firefox's built-in find-in-page API, for, for example, allowing you to bind find-next and find-previous to `n` and `N`.
-   Monitor extension usage and manage themes:
    -   Tridactyl needs this to integrate with and avoid conflicts with other extensions. For example, Tridactyl's contextual identity features use this to cooperate with the Multi-Account Containers extension.
-   Hide tabs:
    -   Tridactyl needs this for tab group commands, which allow associating names with different groups of tabs and showing the tabs from only of those groups at a time.

[betas]: https://tridactyl.cmcaine.co.uk/betas/?sort=time&order=desc
