/** Key-sequence parser

    If `map` is a Map of `MinimalKey[]` to objects (exstrs or callbacks)
    and `keyseq` is an array of [[MinimalKey]] compatible objects...

     - `parse(keyseq, map)` returns the mapped object and a count OR a prefix
       of `MinimalKey[]` (possibly empty) that, if more keys are pressed, could
       map to an object.
     - `completions(keyseq, map)` returns the fragment of `map` that keyseq is
       a valid prefix of.
     - `mapstrToKeySeq` generates KeySequences for the rest of the API.

    No key sequence in a `map` may be a prefix of another key sequence in that
    map. This is a point of difference from Vim that removes any time-dependence
    in the parser. Vimperator, Pentadactyl, saka-key, etc, all share this
    limitation.

    If a key is represented by a single character then the shift modifier state
    is ignored unless other modifiers are also present.

*/

/** */
import { filter, find, izip } from "@src/lib/itertools"
import { Parser } from "@src/lib/nearley_utils"
import * as config from "@src/lib/config"
import * as R from "ramda"
import grammar from "@src/grammars/.bracketexpr.generated"
const bracketexpr_grammar = grammar
const bracketexpr_parser = new Parser(bracketexpr_grammar)

// {{{ General types

export interface KeyModifiers {
    altKey?: boolean
    ctrlKey?: boolean
    metaKey?: boolean
    shiftKey?: boolean
}

export class MinimalKey {
    readonly altKey = false
    readonly ctrlKey = false
    readonly metaKey = false
    readonly shiftKey = false

    constructor(readonly key: string, modifiers?: KeyModifiers) {
        if (modifiers !== undefined) {
            for (const mod of Object.keys(modifiers)) {
                this[mod] = modifiers[mod]
            }
        }
    }

    /** Does this key match a given MinimalKey extending object? */
    public match(keyevent) {
        // 'in' doesn't include prototypes, so it's safe for this object.
        for (const attr in this) {
            // Don't check shiftKey for normal keys.
            if (attr === "shiftKey" && this.key.length === 1) continue
            if (this[attr] !== keyevent[attr]) return false
        }
        return true
    }

    public toMapstr() {
        let str = ""
        let needsBrackets = this.key.length > 1

        // Format modifiers
        const modifiers = new Map([
            ["A", "altKey"],
            ["C", "ctrlKey"],
            ["M", "metaKey"],
            ["S", "shiftKey"],
        ])
        for (const [letter, attr] of modifiers.entries()) {
            if (this[attr]) {
                str += letter
                needsBrackets = true
            }
        }
        if (str) {
            str += "-"
        }

        let key = this.key
        if (key === " ") {
            key = "Space"
            needsBrackets = true
        }

        // Format the rest
        str += key
        if (needsBrackets) {
            str = "<" + str + ">"
        }

        return str
    }
}

export type KeyEventLike = MinimalKey | KeyboardEvent

// }}}

// {{{ parser and completions

type MapTarget = string | ((...args: any[]) => any)
type KeyMap = Map<MinimalKey[], MapTarget>

export interface ParserResponse {
    keys?: KeyEventLike[]
    value?: string
    exstr?: string
    isMatch?: boolean
    numericPrefix?: number
}

function splitNumericPrefix(
    keyseq: KeyEventLike[],
): [KeyEventLike[], KeyEventLike[]] {
    // If the first key is in 1:9, partition all numbers until you reach a non-number.
    if ([1, 2, 3, 4, 5, 6, 7, 8, 9].includes(Number(keyseq[0].key))) {
        const prefix = [keyseq[0]]
        for (const ke of keyseq.slice(1)) {
            if ([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].includes(Number(ke.key)))
                prefix.push(ke)
            else break
        }
        const rest = keyseq.slice(prefix.length)
        return [prefix, rest]
    } else {
        return [[], keyseq]
    }
}

export function stripOnlyModifiers(keyseq) {
    return keyseq.filter(
        key =>
            !["Control", "Shift", "Alt", "AltGraph", "Meta"].includes(key.key),
    )
}

export function parse(keyseq: KeyEventLike[], map: KeyMap): ParserResponse {
    // Remove bare modifiers
    keyseq = stripOnlyModifiers(keyseq)

    // If the keyseq is now empty, abort.
    if (keyseq.length === 0) return { keys: [], isMatch: false }

    // Split into numeric prefix and non-numeric suffix
    let numericPrefix: KeyEventLike[]
    ;[numericPrefix, keyseq] = splitNumericPrefix(keyseq)

    // If keyseq is a prefix of a key in map, proceed, else try dropping keys
    // from keyseq until it is empty or is a prefix.
    let possibleMappings = completions(keyseq, map)
    while (possibleMappings.size === 0 && keyseq.length > 0) {
        keyseq.shift()
        numericPrefix = []
        possibleMappings = completions(keyseq, map)
    }

    if (possibleMappings.size > 0) {
        // Check if any of the mappings is a perfect match (this will only
        // happen if some sequences in the KeyMap are prefixes of other seqs).
        try {
            const perfect = find(
                possibleMappings,
                ([k, _v]) => k.length === keyseq.length,
            )
            return {
                value: perfect[1],
                exstr: perfect[1] + numericPrefixToExstrSuffix(numericPrefix),
                isMatch: true,
                numericPrefix: numericPrefix.length
                    ? Number(numericPrefix.map(ke => ke.key).join(""))
                    : undefined,
                keys: [],
            }
        } catch (e) {
            if (!(e instanceof RangeError)) throw e
        }
    }

    // keyseq is the longest suffix of keyseq that is the prefix of a
    // command, numericPrefix is a numeric prefix of that. We want to
    // preserve that whole thing, so concat them back together before
    // returning.
    return { keys: numericPrefix.concat(keyseq), isMatch: keyseq.length > 0 }
}

/** True if seq1 is a prefix or equal to seq2 */
function prefixes(seq1: KeyEventLike[], seq2: MinimalKey[]) {
    if (seq1.length > seq2.length) {
        return false
    } else {
        for (const [key1, key2] of izip(seq1, seq2)) {
            if (!key2.match(key1)) return false
        }
        return true
    }
}

/** returns the fragment of `map` that keyseq is a valid prefix of. */
export function completions(keyseq: KeyEventLike[], map: KeyMap): KeyMap {
    return new Map(
        filter(map.entries(), ([ks, _maptarget]) => prefixes(keyseq, ks)),
    )
}

// }}}

// {{{ mapStrToKeySeq stuff

/** Expand special key aliases that Vim provides to canonical values

    Vim aliases are case insensitive.
*/
function expandAliases(key: string) {
    // Vim compatibility aliases
    const aliases = {
        cr: "Enter",
        esc: "Escape",
        return: "Enter",
        enter: "Enter",
        space: " ",
        bar: "|",
        del: "Delete",
        bs: "Backspace",
        lt: "<",
    }
    if (key.toLowerCase() in aliases) return aliases[key.toLowerCase()]
    else return key
}

/** String starting with a `<` to MinimalKey and remainder.

    Bracket expressions generally start with a `<` contain no angle brackets or
    whitespace and end with a `>.` These special-cased expressions are also
    permitted: `<{modifier}<>`, `<{modifier}>>`, and `<{modifier}->`.

    If the string passed does not match this definition, it is treated as a
    literal `<.`

    Backus Naur approximation:

    ```
        - bracketexpr ::= '<' modifier? key '>'
        - modifier ::= 'm'|'s'|'a'|'c' '-'
        - key ::= '<'|'>'|/[^\s<>-]+/
    ```

    See `src/grammars/bracketExpr.ne` for the canonical definition.

    Modifiers are case insensitive.

    Some case insensitive vim compatibility aliases are also defined, see
    [[expandAliases]].

    Compatibility breaks:

    Shift + key must use the correct capitalisation of key:
        `<S-j> != J, <S-J> == J`.

    In Vim `<A-x> == <M-x>` on most systems. Not so here: we can't detect
    platform, so just have to use what the browser gives us.

    Vim has a predefined list of special key sequences, we don't: there are too
    many (and they're non-standard) [1].

    In the future, we may just use the names as defined in keyNameList.h [2].

    In Vim, you're still allowed to use `<lt>` within angled brackets:
        `<M-<> == <M-lt> == <M-<lt>>`
    Here only the first two will work.

    Restrictions:

    It is not possible to map to a keyevent that actually sends the key value
    of any of the aliases or to any multi-character sequence containing a space
    or `>.` It is unlikely that browsers will ever do either of those things.

    [1]: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values
    [2]: https://searchfox.org/mozilla-central/source/dom/events/KeyNameList.h

*/
export function bracketexprToKey(inputStr) {
    if (inputStr.indexOf(">") > 0) {
        try {
            const [
                [modifiers, key],
                remainder,
            ] = bracketexpr_parser.feedUntilError(inputStr)
            return [new MinimalKey(expandAliases(key), modifiers), remainder]
        } catch (e) {
            // No valid bracketExpr
            return [new MinimalKey("<"), inputStr.slice(1)]
        }
    } else {
        // No end bracket to match == no valid bracketExpr
        return [new MinimalKey("<"), inputStr.slice(1)]
    }
}

/** Generate KeySequences for the rest of the API.

    A map expression is something like:

    ```
    j scrollline 10
    <C-f> scrollpage 0.5
    <C-d> scrollpage 0.5
    <C-/><C-n> mode normal
    ```

    A mapstr is the bit before the space.

    mapstrToKeyseq turns a mapstr into a keySequence that looks like this:

    ```
    [MinimalKey {key: 'j'}]
    [MinimalKey {key: 'f', ctrlKey: true}]
    [MinimalKey {key: 'd', ctrlKey: true}]
    [MinimalKey {key: '/', ctrlKey: true}, MinimalKey {key: 'n', ctrlKey: true}]
    ```

    (All four {modifier}Key flags are actually provided on all MinimalKeys)
*/
export function mapstrToKeyseq(mapstr: string): MinimalKey[] {
    const keyseq: MinimalKey[] = []
    let key: MinimalKey
    // Reduce mapstr by one character or one bracket expression per iteration
    while (mapstr.length) {
        if (mapstr[0] === "<") {
            ;[key, mapstr] = bracketexprToKey(mapstr)
            keyseq.push(key)
        } else {
            keyseq.push(new MinimalKey(mapstr[0]))
            mapstr = mapstr.slice(1)
        }
    }
    return keyseq
}

export const commandKey2jsKey = {
    Comma: ",",
    Period: ".",
    Up: "ArrowUp",
    Down: "ArrowDown",
    Left: "ArrowLeft",
    Right: "ArrowRight",
    Space: " ",
}

/*
 * Convert a Commands API shortcut string to a MinimalKey. NB: no error checking done, media keys probably unsupported.
 */
export function mozMapToMinimalKey(mozmap: string): MinimalKey {
    const arr = mozmap.split("+")
    const modifiers = {
        altKey: arr.includes("Alt"),
        ctrlKey: arr.includes("MacCtrl"), // MacCtrl gives us _actual_ ctrl on all platforms rather than splat on Mac and Ctrl everywhere else
        shiftKey: arr.includes("Shift"),
        metaKey: arr.includes("Command"),
    }
    let key = arr[arr.length - 1]
    key = R.propOr(key.toLowerCase(), key, commandKey2jsKey)
    // TODO: support mediakeys: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands#Media_keys

    return new MinimalKey(key, modifiers)
}

/*
 * Convert a minimal key to a Commands API compatible bind. NB: no error checking done.
 *
 * Ctrl-key behaviour on Mac may be surprising.
 */
export function minimalKeyToMozMap(key: MinimalKey): string {
    const mozMap: string[] = []
    key.altKey && mozMap.push("Alt")
    key.ctrlKey && mozMap.push("MacCtrl")
    key.shiftKey && mozMap.push("Shift")
    key.metaKey && mozMap.push("Command")
    const jsKey2commandKey = Object.fromEntries(
        Object.entries(commandKey2jsKey).map(([key, value]) => [value, key]),
    )
    mozMap.push(R.propOr(key.key.toUpperCase(), key.key, jsKey2commandKey))
    return mozMap.join("+")
}

/** Convert a map of mapstrs (e.g. from config) to a KeyMap */
export function mapstrMapToKeyMap(mapstrMap: Map<string, MapTarget>): KeyMap {
    const newKeyMap = new Map()
    for (const [mapstr, target] of mapstrMap.entries()) {
        newKeyMap.set(mapstrToKeyseq(mapstr), target)
    }
    return newKeyMap
}

let KEYMAP_CACHE = {}

export function translateKeysInPlace(keys, conf): void {
    // If so configured, translate keys using the key translation map
    if (config.get("keytranslatemodes")[conf] === "true") {
        const translationmap = config.get("keytranslatemap")
        translateKeysUsingKeyTranslateMap(keys, translationmap)
    }
}

/**
 * Return a "*maps" config converted into sequences of minimalkeys (e.g. "nmaps")
 */
export function keyMap(conf): KeyMap {
    if (KEYMAP_CACHE[conf]) return KEYMAP_CACHE[conf]

    // Fail silently and pass keys through to page if Tridactyl hasn't loaded yet
    if (!config.INITIALISED) return new Map()

    const mapobj: { [keyseq: string]: string } = config.get(conf)
    if (mapobj === undefined)
        throw new Error(
            "No binds defined for this mode. Reload page with <C-r> and add binds, e.g. :bind --mode=[mode] <Esc> mode normal",
        )

    // Convert to KeyMap
    const maps = new Map(Object.entries(mapobj))
    KEYMAP_CACHE[conf] = mapstrMapToKeyMap(maps)
    return KEYMAP_CACHE[conf]
}

// }}}

// {{{ Utility functions for dealing with KeyboardEvents

export function hasModifiers(keyEvent: KeyEventLike) {
    return (
        keyEvent.ctrlKey ||
        keyEvent.altKey ||
        keyEvent.metaKey ||
        keyEvent.shiftKey
    )
}

/** shiftKey is true for any capital letter, most numbers, etc. Generally care about other modifiers. */
export function hasNonShiftModifiers(keyEvent: KeyEventLike) {
    return keyEvent.ctrlKey || keyEvent.altKey || keyEvent.metaKey
}

/** A simple key event is a non-special key (length 1) that is not modified by ctrl, alt, or shift. */
export function isSimpleKey(keyEvent: KeyEventLike) {
    return !(keyEvent.key.length > 1 || hasNonShiftModifiers(keyEvent))
}

function numericPrefixToExstrSuffix(numericPrefix: KeyEventLike[]) {
    if (numericPrefix.length > 0) {
        return " " + numericPrefix.map(k => k.key).join("")
    } else {
        return ""
    }
}

/**
 * Translates the given set of keyEvents (in place) as specified by
 * the given key translation map. All keys *and* values in the key
 * translation map must be length-1 strings.
 */
export function translateKeysUsingKeyTranslateMap(
    keyEvents: KeyEventLike[],
    keytranslatemap: { [inkey: string]: string },
) {
    for (let index = 0; index < keyEvents.length; index++) {
        const keyEvent = keyEvents[index]
        const newkey = keytranslatemap[keyEvent.key]

        // KeyboardEvents can't have been translated, MinimalKeys may
        // have been. We can't add anything to the MinimalKey without
        // breaking a ton of other stuff, so instead we'll just assume
        // that the only way we've gotten a MinimalKey is if the key
        // has already been translated. We err way on the side of
        // safety becase translating anything more than once would
        // almost certainly mean oscillations and other super-weird
        // breakage.
        const neverTranslated = keyEvent instanceof KeyboardEvent
        if (neverTranslated && newkey !== undefined) {
            // We can't update the keyEvent in place. However, the
            // entire pipeline works with MinimalKeys all the way
            // through, so we just swap the key event out for a new
            // MinimalKey with the right key and modifiers copied from
            // the original.
            keyEvents[index] = new MinimalKey(newkey, {
                altKey: keyEvent.altKey,
                ctrlKey: keyEvent.ctrlKey,
                metaKey: keyEvent.metaKey,
                shiftKey: keyEvent.shiftKey,
            })
        }
    }
}

// }}}

browser.storage.onChanged.addListener(changes => {
    if ("userconfig" in changes) {
        KEYMAP_CACHE = {}
    }
})
