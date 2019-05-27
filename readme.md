![Tridactyl logo](src/static/logo/Tridactyl_200px.png)

# Tridactyl [![Build Status](https://travis-ci.org/tridactyl/tridactyl.svg?branch=master)](https://travis-ci.org/tridactyl/tridactyl) [![Matrix Chat][matrix-badge]][matrix-link] [![Gitter Chat][gitter-badge]][gitter-link]

Replace Firefox's default control mechanism with one modelled on the one true editor, Vim.

![Gigantic GIF showing Tridactyl in action](doc/AMO_screenshots/trishowcase.gif)

## Installing

[Simply click this link in Firefox to install our latest "beta" build][riskyclick]. These [betas][betas] are updated with each commit to master on this repo. Your browser will automatically update from there once a day. If you want more frequent updates, you can change `extensions.update.interval` in `about:config` to whatever time you want, say, 15 minutes (900 seconds). Alternatively, you can get our "stable" builds straight from [Mozilla][amo]. The changelog for the stable versions can be found [here](https://github.com/tridactyl/tridactyl/blob/master/CHANGELOG.md). There is also another beta build that comes without a new tab page. You can get it from [here][nonewtablink]. If you want to use advanced features such as edit-in-Vim, you'll also need to install the native messenger or executable, instructions for which can be found by typing `:installnative` and hitting enter once you are in Tridactyl. To migrate your configuration across builds, see [this comment][migratelink].

Type `:help` or press `<F1>` for online help once you're in :)

Remember that Tridactyl cannot run on any page on about:\*, data:\*, view-source:\* and file:\*. We're sorry about that and we're working with Firefox to improve this situation by removing restrictions on existing APIs and developing a new API.

We can now run on addons.mozilla.org and a few other websites if you run `fixamo` once you've installed the native messenger. `help fixamo` tells you exactly what it does.

If you're enjoying Tridactyl, or not, please leave a review on the [AMO](https://addons.mozilla.org/en-US/firefox/addon/tridactyl-vim/reviews/).

## Highlighted features

Like Vim, Tridactyl is modal, with the default mode being "normal mode". In "normal mode", many functions are available using keybindings. In "command mode" (when the command line is shown), you can execute more complex commands, known as "ex-commands". All Tridactyl functionality can be accessed by ex-commands. You can bind any ex-command to a normal-mode shortcut. We also support a `.tridactylrc` file, of which there is an example in the root of this repository.

### Default normal-mode bindings

This is a (non-exhaustive) list of the most common normal-mode bindings. Type `:help` to open the online help for more details.

-   `:` — activate the command line
-   `Shift` + `Insert` — enter "ignore mode". Press `Shift` + `Insert` again to return to "normal mode".
-   `ZZ` — close all tabs and windows, but only "save" them if your about:preferences are set to "show your tabs and windows from last time"
-   `.` — repeat the last command

You can try `:help key` to know more about `key`. If it is an existing binding, it will take you to the help section of the command that will be executed when pressing `key`. For example `:help .` will take you to the help section of the `repeat` command.

#### Navigating with the current page

-   `j`/`k` — scroll down/up
-   `h`/`l` — scroll left/right
-   `^`/`$` — scroll to left/right margin
-   `gg`/`G` — scroll to start/end of page
-   `f`/`F`/`gF` — enter "hint mode" to select a link to follow. `F` to open in a background tab (note: hint characters should be typed in lowercase). `gF` to repeatedly open links until you hit `<Escape>`.
-   `gi` — scroll to and focus the last-used input on the page
-   `r`/`R` — reload page or hard reload page
-   `yy` — copy the current page URL to the clipboard
-   `[[`/`]]` — navigate forward/backward though paginated pages, for example comics, multi-part articles, search result pages, etc.
-   `]c`/`[c` — increment/decrement the current URL by 1
-   `gu` — go to the parent of the current URL
-   `gU` — go to the root domain of the current URL
-   `gr` — open Firefox reader mode (note: Tridactyl will not work in this mode)
-   `zi`/`zo`/`zz` — zoom in/out/reset zoom
-   `<C-f>`/`<C-b>` — jump to the next/previous part of the page

#### Find mode

Find mode is still incomplete and uses the Firefox feature "Quick Find". This will be improved eventually.

-   `/` — open the find search box
-   `<C-g>`/`<C-G>` — find the next/previous instance of the last find operation (note: these are the standard Firefox shortcuts)

Please note that Tridactyl overrides Firefox's `<C-f>` search, replacing it with a binding to go to the next part of the page. If you want to be able to use `<C-f>` again to search for things, use `unbind <C-f>`.

#### Bookmarks and quickmarks

-   `A` — bookmark the current page
-   `a` — bookmark the current page, but allow the URL to be modified first
-   `M<key>` — bind a quickmark to the given key
-   `go<key>`/`gn<key>`/`gw<key>` — open a given quickmark in current tab/new tab/new window

If you want to use Firefox's default `<C-b>` binding to open the bookmarks sidebar, make sure to run `unbind <C-b>` because Tridactyl replaces this setting with one to go to the previous part of the page.

#### Navigating to new pages:

-   `o`/`O` — open a URL (or default search) in this tab (`O` to pre-load current URL)
-   `t`/`T` — open a URL (or default search) in a new tab (`T` to pre-load current URL)
-   `w`/`W` — open a URL (or default search) in a new window (`W` to pre-load current URL)
-   `p`/`P` — open the clipboard contents in the current/new tab
-   `s`/`S` — force a search using the default Tridactyl search engine, opening in the current/new tab. This is useful when searching for something that would otherwise be treated as a URL by `o` or `t`
-   `H`/`L` — go back/forward in the tab history
-   `gh`/`gH` — go to the pages you have set with `set home [url1] [url2] ...`

#### Handling tabs

-   `d` — close the current tab
-   `u` — undo the last tab/window closure
-   `gt`/`gT` — go to the next/previous tab
-   `g^`/`g$` — go to the first/last tab
-   `b` — bring up a list of open tabs in the current window; you can type the tab ID or part of the title or URL to choose a tab

#### Extended hint mode

Extended hint modes allow you to perform actions on page items:

-   `;i`/`;I` — open an image (in current/new tab)
-   `;s`/`;a` — save/save-as the linked resource
-   `;S`/`;A` — save/save-as the selected image
-   `;p` — copy an element's text to the clipboard
-   `;P` — copy an element's title/alt text to the clipboard
-   `;y` — copy an element's link URL to the clipboard
-   `;#` — copy an element's anchor URL to the clipboard
-   `;r` — read the element's text with text-to-speech
-   `;k` — delete an element from the page
-   `;;` — focus an element

Additionally, you can hint elements matching a custom CSS selector with `:hint -c [selector]` which is useful for site-specific versions of the standard `f` hint mode.

### Binding custom commands

You can bind your own shortcuts in normal mode with the `:bind` command. For example `:bind J tabprev` to bind `J` to switch to the previous tab. See `:help bind` for details about this command.

## WebExtension-related issues

-   Navigation to any about:\* pages using `:open` requires the native messenger.
-   Firefox will not load Tridactyl on about:\*, some file:\* URIs, view-source:\*, or data:\*. On these pages Ctrl-L (or F6), Ctrl-Tab, Ctrl-W, and the `tri` [omnibox keyword](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Omnibox) are your escape hatches.
    -   addons.mozilla.org is now supported so long as you run `fixamo` first.
-   Tridactyl now supports changing the Firefox GUI if you have the native messenger installed via `guiset`. There's quite a few options available, but `guiset gui none` is probably what you want, perhaps followed up with `guiset tabs always`. See `:help guiset` for a list of all possible options.

## Frequently asked questions

-   Why doesn't Tridactyl respect my search engine settings?

    It used to be a webextension limitation but it's not anymore. There are plans to fix this, see [#792](https://github.com/tridactyl/tridactyl/issues/792).

-   Why doesn't Tridactyl work/why does it break the websites I'm trying to use? or 'Help! A website I use is totally blank when I try to use it with Tridactyl enabled!' or 'Why doesn't Tridactyl work on some pages?'

    Please visit our [troubleshooting guide](https://github.com/tridactyl/tridactyl/blob/master/doc/troubleshooting.md).

-   How can I change the search engine?

    `set searchengine duckduckgo`

-   How can I add a search engine?

    `set searchurls.esa http://www.esa.int/esasearch?q=`

    You can also add `%s` to specify exactly where the search query should go, which is useful for more inventive uses, such as

    `set searchurls.phrasebook https://translate.google.co.uk/#en/%s/my%20hovercraft%20is%20full%20of%20eels`

    after which `open phrasebook [fr|de|la|es|hi|it...]` will work as expected.

-   Can I import/export settings, and does Tridactyl use an external configuration file just like Vimperator?

    Yes, if you have `native` working, `$XDG_CONFIG_DIR/tridactyl/tridactylrc` or `~/.tridactylrc` will be read at startup via an `autocmd` and `source`. There is an [example file available on our repository](https://github.com/tridactyl/tridactyl/blob/master/.tridactylrc).

    If you can't use the native messenger for some reason, there is a workaround: if you do `set storageloc local`, a JSON file will appear at `<your firefox profile>\browser-extension-data\tridactyl.vim@cmcaine.co.uk\storage.js`. You can find your profile folder by going to `about:support`. You can edit this file to your heart's content.

-   How can I change the colors or theme used by Tridactyl?

    Use `:colors dark` (authored by @furgerf), `:colors shydactyl` (authored by @atrnh) or `:colors greenmat` (authored by @caputchinefrobles). Tridactyl can also load themes from disk, which would let you use one of the themes authored by @bezmi ([bezmi/base16-tridactyl](https://github.com/bezmi/base16-tridactyl)), see `:help colors` for more information.

-   How to remap keybindings? or How can I bind keys using the control/alt key modifiers (eg: `ctrl+^`)?

    You can remap keys in normal, ignore, input and insert mode with `:bind --mode=$mode $key $excmd`. Hint mode and the command line are currently special and can't be rebound. See `:help bind` for more information.

    Modifiers can be bound like this: `:bind <C-f> scrollpage 1`. Special keys can be bound too: `:bind <F3> colors dark` and with modifiers: `:bind <S-F3> colors default` and with multiple modifiers: `:bind <SA-F3> composite set hintchars 1234567890 | set hintfiltermode vimperator-reflow`

    The modifiers are case insensitive. Special key names are not. The names used are those reported by Javascript with a limited number of vim compatibility aliases (e.g. `CR == Enter`).

    If you want to bind <C-^> you'll find that you'll probably need to press Control+Shift+6 to trigger it. The default bind is <C-6> which does not require you to press shift.

-   How can I tab complete from bookmarks?

    `bmarks`. Bookmarks are not currently supported on `*open`: see [issue #214](https://github.com/tridactyl/tridactyl/issues/214).

-   When I type 'f', can I type link names (like Vimperator) in order to narrow down the number of highlighted links?

    You can, thanks to @saulrh. First `set hintfiltermode vimperator` and then `set hintchars 1234567890`.

-   Where can I find a changelog for the different versions (to see what is new in the latest version)?

    [Here.](https://github.com/tridactyl/tridactyl/blob/master/CHANGELOG.md)

-   Why can't I use my bookmark keywords?

    Mozilla doesn't give us access to them. See [issue #73](https://github.com/tridactyl/tridactyl/issues/73).

-   Can I set/get my bookmark tags from Tridactyl?

    No, Mozilla doesn't give us access to them either.

-   Why doesn't Tridactyl work on websites with frames?

    It should work on some frames now. See [#122](https://github.com/tridactyl/tridactyl/issues/122).

-   Can I change proxy via commands?

    Not yet, but this feature will eventually be implemented.

-   How do I disable Tridactyl on certain sites?

    You can use `blacklistadd`, like this: `blacklistadd mail.google.com/mail`. See `:help blacklistadd`. Also note that if you want something like the passkeys or ignorekeys features vimperator/pentadactyl had, you can use `bindurl`. See `:help bindurl`.

-   How can I list the current bindings?

    `viewconfig nmaps` works OK, but Tridactyl commands won't work on the shown page for "security reasons". We'll eventually provide a better way. See [#98](https://github.com/tridactyl/tridactyl/issues/98).

-   How can I know which mode I'm in/have a status line?

    Press `j` and see if you scroll down :) There's no status line yet: see [#210](https://github.com/tridactyl/tridactyl/issues/210), but we do have a "mode indicator" in the bottom right. It even goes purple when you're in a private window :).

-   Does anyone actually use Tridactyl?

    In addition to the developers, some other people do. Mozilla keeps tabs on stable users [here](https://addons.mozilla.org/en-US/firefox/addon/tridactyl-vim/statistics/?last=30). The maintainers guess the number of unstable users from unique IPs downloading the betas each week when they feel like it. Last time they checked there were 2800 of them.

-   How do I prevent websites from stealing focus?

    There are two ways to do that, the first one is `set allowautofocus false` (if you do this you'll probably also want to set `browser.autofocus` to false in `about:config`). This will prevent the page's `focus()` function from working and could break javascript text editors such as Ace or CodeMirror. Another solution is to use `autocmd TabEnter .* unfocus` in the beta, JS text editors should still work but pages won't steal focus when entering their tabs anymore.

## Contributing

### Donations

We gratefully accept donations via [PayPal](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=7JQHV4N2YZCTY) and [Patreon](https://www.patreon.com/tridactyl). If you can, please make this a monthly donation as it makes it much easier to plan.

<a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=7JQHV4N2YZCTY"><img src="https://www.paypalobjects.com/en_US/GB/i/btn/btn_donateCC_LG.gif" alt="PayPal"></a>

Funds will be used at the discretion of the main contributors (currently bovine3dom, cmcaine, glacambre and antonva) for Tridactyl-related expenditure, such as domain names, server costs, small thank-yous to contributors such as stickers, and victuals for hackathons.

### Building and installing

Onboarding:

```
git clone https://github.com/tridactyl/tridactyl.git
cd tridactyl
npm install
npm run build
```

Each time package.json or package-lock.json change after you checkout or pull, you should run `npm install` again.

Addon is built in tridactyl/build. Load it as a temporary addon in firefox with `about:debugging` or see [Development loop](#Development-loop). The addon should work in Firefox 52+, but we're only deliberately supporting >=57.

If you want to install a local copy of the add-on into your developer or nightly build of firefox then you can enable installing unsigned add-ons and then build it like so:

```
# Build tridactyl if you haven't done that yet
npm run build
# Package for a browser
"$(npm bin)/web-ext" build -s build
```

If you want to build a signed copy (e.g. for the non-developer release), you can do that with `web-ext sign`. You'll need some keys for AMO and to edit the application id in `src/manifest.json`. There's a helper script in `scripts/sign` that's used by our build bot and for manual releases.

### Building on Windows

-   Install [Git for Windows][win-git]

-   Install [NodeJS for Windows][win-nodejs]

    -   Current 8.11.1 LTS seems to work fine

-   Launch the installation steps described above from MinTTY shell
    -   Also known as "Git Bash"

[win-git]: https://git-scm.com/download/win
[win-nodejs]: https://nodejs.org/dist/v8.11.1/node-v8.11.1-x64.msi
[pyinstaller]: https://www.pyinstaller.org
[gpg4win]: https://www.gpg4win.org

<!--- ## Disable GPG signing for now, until decided otherwise later

### Cryptographically Verifying the Compiled Native Binary on Windows

  - `native_main.py` is compiled to `native_main.exe` for Windows using [PyInstaller][pyinstaller]. The goal is to relieve Tridactyl users on Windows from having to install the whole Python 3 distribution.

  - Due to `native_main.exe` being a binary-blob and difficult to easily review like the plain-text `native_main.py` counterpart, it is **strongly** recommended the users verify the SHA-256 hash and GPG signatures using the following commands on Powershell.

**Verifying SHA-256 Hash**

```
## Change directory to Tridactyl's native-messanger directory
PS C:\> cd "$env:HOME\.tridactyl"

## Run `dir` and check `native_main.exe` is found
PS C:\Users\{USERNAME}\.tridactyl> dir

## Download `native_main.exe.sha256` containing the SHA-256 sum
PS C:\Users\{USERNAME}\.tridactyl> iwr https://raw.githubusercontent.com/gsbabil/tridactyl/master/native/native_main.exe.sha256 -OutFile native_main.exe.sha256

## Print the SHA-256 sum from `native_main.exe.sha256`
PS C:\Users\{USERNAME}\.tridactyl> (Get-FileHash native_main.exe -Algorithm SHA256).Hash.ToLower()

## Compute SHA-256 sum from `native_main.exe`
PS C:\Users\{USERNAME}\.tridactyl> Get-Content -Path native_main.exe.sha256 | %{$_ .Split(' ')[0]}

## Compare results of the of the last two commands ...
```

**Verifying OpenPGP Signature***

  - First, download [`GPG4Win`][gpg4win] from this website and
      install in on your system

  - Once `gpg2` is on your path, go to Powershell and run the
      following commands to verify OpenPGP signature:

```
## Change directory to Tridactyl's native-messanger directory
PS C:\> cd "$env:HOME\.tridactyl"

## Run `dir` and check `native_main.exe` is found
PS C:\Users\{USERNAME}\.tridactyl> dir

## Download `native_main.exe.sig` containing the OpenPGP signature
PS C:\Users\{USERNAME}\.tridactyl> iwr https://raw.githubusercontent.com/gsbabil/tridactyl/master/native/native_main.exe.sig -OutFile native_main.exe.sig

## Download `gsbabil-pub.asc` to verify the signature
PS C:\Users\{USERNAME}\.tridactyl> iwr https://raw.githubusercontent.com/gsbabil/tridactyl/master/native/gsbabil-pub.asc -OutFile gsbabil-pub.asc

## Import `gsbabil-pub.asc` into your GPG key-ring
PS C:\Users\{USERNAME}\.tridactyl> gpg2 --armor --import gsbabil-pub.asc

## Verify signature using `gpg2`
PS C:\Users\{USERNAME}\.tridactyl> gpg2 --verify .\native_main.exe.sig .\native_main.exe
```

--->

### Development loop

```
npm run build & npm run run
```

<!-- This will compile and deploy your files each time you save them. -->

You'll need to run `npm run build` every time you edit the files, and press "r" in the `npm run run` window to make sure that the files are properly reloaded.

### Committing

A pre-commit hook is added by `npm install` that simply runs `npm test`. If you know that your commit doesn't break the tests you can commit with `git commit -n` to ignore the hooks. If you're making a PR, travis will check your build anyway.

### Documentation

Ask in `#tridactyl` on [matrix.org][matrix-link], freenode, or [gitter][gitter-link]. We're friendly!

Default keybindings are currently best discovered by reading the [default config](./src/lib/config.ts).

Code is not _too_ badly commented, and some higher-level documentation can be found in the doc directory. Some of it is out of date, but [`architecture.md`](doc/architecture.md) and [`writing_an_excmd.md`](doc/writing_an_excmd.md) should still apply.

## Principles and objectives

Principles:

-   Keyboard > mouse
-   default keybinds should be Vim-like
-   actions should be composable and repeatable
-   ex mode should expose all the browser functionality anyone might want
-   Arguable: most (all?) actions should have an ex mode version (departure from Vim?)
-   users can map and define their own actions and commands

Other objectives:

-   be fast - the whole point of a keyboard interface is to be more efficient, don't compromise that with slow code
-   don't crash - we're the new UI and we shouldn't crash
-   be maintainable - code should be well documented, reasoned about and tested.

## Logo acknowledgement

The logo was designed by Jake Beazley using free vector art by <a target="_blank" href="https://www.Vecteezy.com">www.Vecteezy.com</a>

[gitter-badge]: https://badges.gitter.im/Join%20Chat.svg
[gitter-link]: https://gitter.im/tridactyl/Lobby
[matrix-badge]: https://matrix.to/img/matrix-badge.svg
[matrix-link]: https://riot.im/app/#/room/#tridactyl:matrix.org
[betas]: https://tridactyl.cmcaine.co.uk/betas/?sort=time&order=desc
[riskyclick]: https://tridactyl.cmcaine.co.uk/betas/tridactyl-latest.xpi
[nonewtablink]: https://tridactyl.cmcaine.co.uk/betas/nonewtab/tridactyl_no_new_tab_beta-latest.xpi
[amo]: https://addons.mozilla.org/en-US/firefox/addon/tridactyl-vim?src=external-github
[migratelink]: https://github.com/tridactyl/tridactyl/issues/79#issuecomment-351132451
