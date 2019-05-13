![Tridactyl logo](logo/Tridactyl_100px.png)

# Tridactyl REPLACE_ME_WITH_THE_VERSION_USING_SED

Tridactyl has to override your new tab page due to WebExtension limitations. You can learn how to change it at the bottom of the page, otherwise please read on for some tips and tricks.

-   You can view the main help page by typing [`:help`][help], and access the tutorial with [`:tutor`][tutor].

-   You can view your current configuration with `:viewconfig`.

-   **Tridactyl retreat** 👀: 4 of the core Tridactyl developers are meeting up in the real world to work on Tridactyl from 24th May - 1st June in the Peak District, UK in late May. [Donate using this link](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=7JQHV4N2YZCTY) if you'd like to contribute to our travel, accommodation and subsistence costs, which we estimate will be about £2,000. We have so far raised £300, so thanks to all of you who have donated. If you have any suggestions for things we should especially focus on, please comment on [this issue](https://github.com/tridactyl/tridactyl/issues/1379).

-   If Tridactyl breaks a website or is broken by a website, trying the steps in the [troubleshooting guide](https://github.com/tridactyl/tridactyl/blob/master/doc/troubleshooting.md) might help.

-   You can contact the developers, other users and contributors for support or whatever on [Matrix][matrix-link], [Gitter][gitter-link], or [IRC][freenode-link].

-   If you're enjoying Tridactyl (or not), please leave a review on [addons.mozilla.org][amo].

REPLACE_ME_WITH_THE_CHANGE_LOG_USING_SED

## Highlighted features:

-   `f`/`F` — enter the "hint mode" to select a link to follow. `F` to open it in a background tab. (Note: hint characters should be typed in lowercase.)
-   `Shift` + `Insert` — enter "ignore mode" to send all key presses to the web page you are on. Press `Shift` + `Insert` again to return to the highly productive "normal mode".
-   `H`/`L` — go back/forward in the history.
-   `o`/`O` — open a URL in this tab (`O` to pre-load current URL).
-   `t`/`T` — open a URL in a new tab (`T` to pre-load current URL).
-   `gt`/`gT` — go to the next/previous tab.
-   `d` — close the current tab.
-   `/` — open the find search box. Use <kbd>ctrl</kbd> + g/G to cycle through search results.
-   `A` — bookmark the current page
-   `b` — bring up a list of open tabs in the current window.
-   `s` — if you want to search for something that looks like a domain name or URL.
-   `gi` — scroll to and focus the last-used input on the page.
-   `gr` — open Firefox reader mode (note: Tridactyl will not work in this mode).
-   Bind your own commands with, e.g., `:bind J tabprev`. Type `:help bind` to see help on custom binds.
-   `yy` — copy the current page URL to your clipboard.
-   `[[`/`]]` — navigate forward/backward though paginated pages.
-   `ZZ` — close all tabs and windows, but it will only "save" them if your about:preferences are set to "show your tabs and windows from last time".
-   [`:help hint`][help-hint] to see all the other useful hint modes (this is the `f` magic. :) ).
-   `:help <keybinding>` to learn more about what a specific key binding does.

## Important limitations due to WebExtensions

-   You can only navigate to most about: and file: pages if you have Tridactyl's native executable installed.
-   Firefox will not load Tridactyl on about:\*, some file:\* URIs, view-source:\*, or data:\*. On these pages Ctrl-L (or F6), Ctrl-Tab and Ctrl-W are your escape hatches.
-   You can change the Firefox GUI with `guiset` (e.g. `guiset gui none` and then `restart`) if you have the native messenger installed, or you can do it yourself by changing your userChrome.
-   Tridactyl cannot capture key presses until web pages are loaded. You can use `:reloadall` to reload all tabs to make life more bearable, or flip `browser.sessionstore.restore_tabs_lazily` to false in `about:config`.

## Why do I see this here?

Tridactyl overrides your newtab page because it cannot insert its content script on the default about:newtab. Without the content script, our shortcuts won't work, even if you're just passing through the page. We're working with Firefox on improvements to the WebExtension APIs that will remove this restriction.

### How can I get rid of it?

-   `:set newtab [URL]`
    -   e.g, `:set newtab about:blank`

Also, if you want to use a new tab page provided by another extension, make sure to install said extension after Tridactyl. Uninstalling and re-installing the other extension should work too.

Alternatively, if you don't need Tridactyl to work on the new tab page, you can install the beta build without new tab page. You can get it [here][nonewtablink].


## FAQ

You have more questions? Have a look at our [FAQ][faq-link].

[1]: https://github.com/tridactyl/tridactyl/issues

<div class="align-left">
[1]: https://github.com/tridactyl/tridactyl/issues<br />
</div>

[faq-link]: https://github.com/tridactyl/tridactyl#frequently-asked-questions
[help]: /static/docs/modules/_src_excmds_.html
[tutor]: /static/clippy/1-tutor.html
[help-hint]: /static/docs/modules/_src_excmds_.html#hint
[gitter-badge]: /static/badges/gitter-badge.svg
[gitter-link]: https://gitter.im/tridactyl/Lobby
[freenode-badge]: /static/badges/freenode-badge.svg
[freenode-link]: ircs://chat.freenode.net/tridactyl
[matrix-badge]: https://matrix.to/img/matrix-badge.svg
[matrix-link]: https://riot.im/app/#/room/#tridactyl:matrix.org
[amo]: https://addons.mozilla.org/en-US/firefox/addon/tridactyl-vim/reviews/
[nonewtablink]: https://tridactyl.cmcaine.co.uk/nonewtab/tridactyl-latest.xpi
