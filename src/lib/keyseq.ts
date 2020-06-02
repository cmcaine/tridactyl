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
import * as R from "ramda"
import { filter, find } from "@src/lib/itertools"
import { Parser } from "@src/lib/nearley_utils"
import * as config from "@src/lib/config"
import grammar from "@src/grammars/.bracketexpr.generated"
const bracketexpr_grammar = grammar
const bracketexpr_parser = new Parser(bracketexpr_grammar)

// {{{ General types

export interface KeyModifiers {
    altKey?: boolean
    ctrlKey?: boolean
    metaKey?: boolean
    shiftKey?: boolean
    keyup?: boolean
    keydown?: boolean
    optional?: boolean
}

/**
 * Do I really have to do this, JS?
 */
export function minimalKeyFromObj(obj) {
    return new MinimalKey(obj.key, {
        altKey: obj.altKey,
        ctrlKey: obj.ctrlKey,
        metaKey: obj.metaKey,
        shiftKey: obj.shiftKey,
        keyup: obj.keyup,
        keydown: obj.keyup,
        optional: obj.optional,
    })
}

export class MinimalKey {
    readonly altKey = false
    readonly ctrlKey = false
    readonly metaKey = false
    readonly shiftKey = false
    readonly keyup = false // keyup == false <=> it is a keydown event
    readonly keydown = false // explicit keydown <=> it is not a repeat event
    readonly optional = false

    constructor(readonly key: string, modifiers?: KeyModifiers) {
        if (modifiers !== undefined) {
            for (const mod of Object.keys(modifiers)) {
                this[mod] = modifiers[mod]
            }
        }
    }

    /** Does this key match a given MinimalKey extending object? */
    // NB: not symmetric!
    public match(keyevent): true | false | "skip" {
        // 'in' doesn't include prototypes, so it's safe for this object.
        for (const attr in this) {
            // Don't check shiftKey for normal keys.
            if (attr === "shiftKey" && this.key.length === 1) continue
            if (attr === "keydown") {
                if (this[attr] && keyevent.repeat) return false // if keydown is set to true, match only if repeat is false
                continue
            }
            if (attr === "optional") {
                continue
            }
            if (this[attr] !== keyevent[attr]) {
                if (this.optional) return "skip"
                return false
            }
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
            ["U", "keyup"],
            ["D", "keydown"],
            ["?", "optional"],
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
    value?: any
    exstr?: any
    isMatch: boolean
    numericPrefix?: number
}

const isDigit = (d: string) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].includes(Number(d))

const isKeyup = (k: any) => k.keyup
// tri.keyseq.splitNumericPrefix(tri.keyseq.mapstrToKeyseq("22b"))
export function splitNumericPrefix(keyseq: KeyEventLike[]): [KeyEventLike[], KeyEventLike[]] {
    // If the first key is in 1:9, partition all numbers until you reach a non-number.
    if (!hasModifiers(keyseq[0]) && !isKeyup(keyseq[0]) && isDigit(keyseq[0].key) && keyseq[0].key !== "0") {
        const prefix = [keyseq[0]]
        let skipcount = 0
        for (const ke of keyseq.slice(1)) {
            if (isKeyup(ke)) {
                if (!isDigit(ke.key)) break
                skipcount++
                continue
            }
            if (!hasModifiers(ke) && isDigit(ke.key)) {
                skipcount++
                prefix.push(ke)
            } else
                break
        }
        const rest = keyseq.slice(skipcount + 1)
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
    if (keyseq.length === 0)
        return { keys: [], isMatch: false }

    // Split into numeric prefix and non-numeric suffix
    let numericPrefix: KeyEventLike[]
    [numericPrefix, keyseq] = splitNumericPrefix(keyseq)

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
                ([k, v]) => k.length === keyseq.length,
            )
            return {
                value: perfect[1],
                exstr: perfect[1] + numericPrefixToExstrSuffix(numericPrefix),
                isMatch: true,
                numericPrefix: numericPrefix.length ? Number(numericPrefix.map(ke => ke.key).join("")) : undefined,
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
        let i = 0
        for (const desired_key of seq2) {
            if (seq1[i] == undefined) break
            switch (desired_key.match(seq1[i])) {
                case false:
                    return false
                case "skip":
                    i = i - 1 // if skipped, we want to try the real key again against the next thing in the sequence
                    break
                case true:
                    break
            }
            i = i + 1
        }
        return true
    }
}

/** returns the fragment of `map` that keyseq is a valid prefix of. */
export function completions(keyseq: KeyEventLike[], map: KeyMap): KeyMap {
    return new Map(
        filter(map.entries(), ([ks, maptarget]) => prefixes(keyseq, ks)),
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
            [key, mapstr] = bracketexprToKey(mapstr)
            keyseq.push(key)
            if (mapstr.length > 1 && !hasExplicitDirection(key)) keyseq.push(minimalKeyFromObj(R.mergeRight(key, {keyup: true, optional: true})))
        } else {
            keyseq.push(new MinimalKey(mapstr[0]))
            if (mapstr.length > 1) keyseq.push(new MinimalKey(mapstr[0], {keyup: true, optional: true})) // Only add optional ups to keys that aren't the final ones
            mapstr = mapstr.slice(1)
        }
    }
    return keyseq
}

const hasExplicitDirection = (key) => key.keyup || key.keydown

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

    let maps: any = config.get(conf)
    if (maps === undefined) throw new Error("No binds defined for this mode. Reload page with <C-r> and add binds, e.g. :bind --mode=[mode] <Esc> mode normal")

    // Convert to KeyMap
    maps = new Map(Object.entries(maps))
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

browser.storage.onChanged.addListener((changes, areaname) => {
    if ("userconfig" in changes) {
        KEYMAP_CACHE = {}
    }
})
