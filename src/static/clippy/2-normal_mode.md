# Normal mode tutorial

Normal mode is where you will spend most of your time.

You can scroll up and down pages using `k` and `j`, and left and right with `h` and `l`; `gg` takes you to the top of the page and `G` to the bottom.

`H` and `L` navigate backwards and forwards in history.

Use `.` to repeat the last action.

Many keypresses in normal mode take you into another mode. `t`, for example, puts you into command mode prefilled with the command for opening a new tab; `F` puts you into hinting mode to open a link in a background tab; `gi` focuses the first text box on the page and allows you to press `Tab` to switch between text boxes.

Tridactyl uses a similar notation to Vim for keys with modifiers: `<C-x>` means press Ctrl, tap x, release Ctrl; i.e. `Ctrl-x`. `<C-` almost always means a literal Ctrl key, even on Macs: `<M-` means the Meta ("splat") key. The exception is when describing default Firefox binds for Macintosh: then `<C-` means Meta. This arises most often for find mode where the `<C-g>`, `<C-G>` and `<C-f>` default binds are all in fact `<M-g>`, `<M-G>` and `<M-f>`.

## Useful normal mode keybinds

-   `b` brings up a list of your current tabs. Press `Tab`/`Shift-Tab` to cycle through them and enter to select. You can also type to filter down the tabs based on their titles, URLs or status (pinned, audible, muted, or discarded)
-   Opening web pages:
    -   `w` opens URLs in new windows
    -   `o` in the current tab
    -   `t` in a new tab
    -   Using a capital letter in place of any of the previous commands opens the command with the current URL pasted into it, i.e, `W`,`O`,`T`
    -   `s` lets you search easily in the current tab and `S` does so in a new tab.
    -   in general, you can search many search engines straight from these prompts by simply starting your query with the search engine, such as `bing` `duckduckgo` or `scholar`
-   Navigate history with `H` and `L`
-   `yy` copies the current URL to your clipboard
-   `p` opens the clipboard contents as a web page, or searches for it, in the current tab. `P` opens it in a new tab
    -   Protip: quickly search for the source of a quote by using `;p` to copy a paragraph, and `P` to search the internet for it
-   `zi`,`zo`,`zz` zoom in, out and return to the default zoom
-   Search text with Firefox's standard `/` binding, jump from match to match with `<C-g>` or `<C-G>` (note that it isn't possible to rebind searching/jumping between matches for now). If you want to use Firefox's `<C-f>` search you'll have to run `unbind <C-f>` (unless you're on a Mac where Firefox's find mode is bound to `<M-f>`).

*   `<C-v>` sends the next keystroke to the current website, bypassing bindings

All the keys in normal mode are bound to commands; for example, `j` is bound to `scrolline 10`. If you are ever curious as to what a key sequence does in normal mode, you can simply use `:bind [keys]` and the command line will tell you to which command they are bound.

## Browser-wide binds

By default, there are three browser "mode" binds: `<C-,>` to `:escapehatch`, and `<C-6>` and `<CS-6>` to `:tab #`. These binds are accessible in all modes and anywhere within Firefox - even on pages where Tridactyl cannot run. New browser mode binds can be added with `:bind --mode=browser [ex command]`. Note that any ex-commands which require access to the page you are on will fail to run if Tridactyl does not have access to that page. The best thing to do is to try it and see.

There are quite a few caveats with these binds - see `:help bind` for more details.

Unbind the binds with `unbind --mode=browser [key]`.

---

The [next page](./3-hint_mode.html) will explain how to use some of the various hint modes. This time try `]]` (guess the next page) to follow the link.

<a href='./1-tutor.html' rel="prev"></a>
