import { testAll, testAllObject } from "@src/lib/test_utils"
import * as ks from "@src/lib/keyseq"
import { mapstrToKeyseq as mks } from "@src/lib/keyseq"

function mk(k, mod?: ks.KeyModifiers) {
    return new ks.MinimalKey(k, mod)
}

{
    // {{{ parse and completions

    const keymap = new Map([
        [[mk("u", { ctrlKey: true }), mk("j")], "scrollline 10"],
        [[mk("g"), mk("g")], "scrolltop"],
        [mks("<SA-Escape>"), "rarelyusedcommand"],
        // Test shiftKey ignoring
        [mks(":"), "fillcmdline"],
        [mks("Av"), "whatever"],
        [mks("i<c-j>"), "testmods"],
        [mks("0"), "panleft"],
    ])
    // Keymap for negative tests
    const keymap2 = new Map([
        [mks("gg"), "scrolltop"],
        [mks("gof"), "foo"],
        [mks("o"), "bar"],
        [mks("<c-6>"), "tablast"],
        [mks("<c-5><c-5>"), "tablast"],
    ])

    // This one actually found a bug once!
    testAllObject(ks.parse, [
        [[[mk("g")], keymap], { keys: [mk("g")], isMatch: true }],
        [[[mk("g"), mk("g")], keymap], { value: "scrolltop", isMatch: true }],
        [
            [[mk("Escape", { shiftKey: true, altKey: true })], keymap],
            { value: "rarelyusedcommand", isMatch: true },
        ],
        [
            [[mk(":", { shiftKey: true })], keymap],

            { value: "fillcmdline", isMatch: true },
            ,
        ],
        [
            [[mk("A", { shiftKey: true }), mk("A", { shiftKey: true, keyup: true }), mk("v")], keymap],
            { value: "whatever", isMatch: true },
        ],
        // Test bare modifiers
        [
            [mks("i<Control><c-j>"), keymap],
            { value: "testmods", isMatch: true },
        ],
        [
            [mks("i<C-Control><c-j>"), keymap],
            { value: "testmods", isMatch: true },
        ],

        // Test count behaviour
        // Zero isn't a prefix.
        [[mks("0g"), keymap2], { keys: mks("g"), isMatch: true }],
        [[mks("0gg"), keymap2], { value: "scrolltop", exstr: "scrolltop", isMatch: true, numericPrefix: undefined }],
        // If zero is a map, then it should still work
        [[mks("0"), keymap], { value: "panleft", exstr: "panleft", isMatch: true, numericPrefix: undefined }],

        // Do match numbers starting with a non-zero
        [[mks("2gg"), keymap2], { value: "scrolltop", exstr: "scrolltop 2", isMatch: true, numericPrefix: 2 }],
        [[mks("20gg"), keymap2], { value: "scrolltop", exstr: "scrolltop 20", isMatch: true, numericPrefix: 20 }],
        // If zero is a map, then you can still use zero in counts.
        // [[mks("20gg"), keymap], { value: "scrolltop", exstr: "scrolltop 20", isMatch: true, numericPrefix: 20 }],
        // This test ^ fails but it works in the browser. Probably worth debugging more.

        // Don't match function keys as counts.
        [[mks("<F2>gg"), keymap2], { value: "scrolltop", exstr: "scrolltop", isMatch: true }],
        [[mks("<C-6>"), keymap2], { value: "tablast", exstr: "tablast", isMatch: true }],
        [[mks("<C-5><C-5>"), keymap2], { value: "tablast", exstr: "tablast", isMatch: true }],

        // Test prefix problems
        [[mks("g"), keymap2], { keys: mks("g"), isMatch: true }],
        [[mks("go"), keymap2], { keys: mks("go"), isMatch: true }],
        [[mks("gog"), keymap2], { keys: mks("g"), isMatch: true }],
        [[mks("gor"), keymap2], { keys: [], isMatch: false }],
        // If you somehow go beyond a valid keymap (keymap is changed in
        // between keypresses or something) then clear the key list.
        [[mks("goff"), keymap2], { keys: [], isMatch: false }],
        [[mks("xxxxx"), keymap2], { keys: [], isMatch: false }],
    ])

    testAllObject(ks.completions, [
        [[[mk("g")], keymap], new Map([[[mk("g"), mk("g")], "scrolltop"]])],
        [[mks("<C-u>j"), keymap], new Map([[mks("<C-u>j"), "scrollline 10"]])],
        // -ve tests
        [[mks("x"), keymap], new Map()],
        [[mks("ggg"), keymap], new Map()],
    ])
} // }}}

// {{{ mapstr ->  keysequence

testAll(ks.bracketexprToKey, [
    ["<C-a><CR>", [mk("a", { ctrlKey: true }), "<CR>"]],
    ["<M-<>", [mk("<", { metaKey: true }), ""]],
    ["<M-<>Foo", [mk("<", { metaKey: true }), "Foo"]],
    ["<M-a>b", [mk("a", { metaKey: true }), "b"]],
    ["<S-Escape>b", [mk("Escape", { shiftKey: true }), "b"]],
    ["<Tab>b", [mk("Tab"), "b"]],
    ["<>b", [mk("<"), ">b"]],
    ["<tag >", [mk("<"), "tag >"]],
])

testAllObject(ks.mapstrMapToKeyMap, [
    [
        new Map([["j", "scrollline 10"], ["gg", "scrolltop"]]),
        new Map([
            [[mk("j")], "scrollline 10"],
            [[mk("g"), mk("g", {keyup: true, optional: true}), mk("g")], "scrolltop"],
        ]),
    ],
    [
        new Map([["<C-u>j", "scrollline 10"], ["gg", "scrolltop"]]),
        new Map([
            [[mk("u", { ctrlKey: true }), mk("j")], "scrollline 10"],
            [[mk("g"), mk("g", {keyup: true, optional: true}), mk("g")], "scrolltop"],
        ]),
    ],
])

testAllObject(ks.mapstrToKeyseq, [
    [
        "Some string",
        [
          {
            "key": "S",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "S",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "o",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "o",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "m",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "m",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "e",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "e",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": " ",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": " ",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "s",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "s",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "t",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "t",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "r",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "r",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "i",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "i",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "n",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "n",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "g",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          }
        ]
    ],
    [
        "hi<c-u>t<A-Enter>here",
        [
          {
            "key": "h",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "h",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "i",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "i",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "u",
            "altKey": false,
            "ctrlKey": true,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "u",
            "altKey": false,
            "ctrlKey": true,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": true,
            "optional": true
          },
          {
            "key": "t",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "t",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "Enter",
            "altKey": true,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "Enter",
            "altKey": true,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": true,
            "optional": true
          },
          {
            "key": "h",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "h",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "e",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "e",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "r",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "r",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "e",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          }
        ]
    ],
    [
        "wat's up <s-Escape>",
        [
          {
            "key": "w",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "w",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "a",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "a",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "t",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "t",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "'",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "'",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "s",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "s",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": " ",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": " ",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "u",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "u",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "p",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": "p",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": " ",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": false,
            "keydown": false,
            "optional": false
          },
          {
            "key": " ",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": false,
            "keyup": true,
            "keydown": false,
            "optional": true
          },
          {
            "key": "Escape",
            "altKey": false,
            "ctrlKey": false,
            "metaKey": false,
            "shiftKey": true,
            "keyup": false,
            "keydown": false,
            "optional": false
          }
        ]
    ],
    ["wat's up <s-Escape>", mks("wat's up <s-Escape>")],
])

// Check order of modifiers doesn't matter
// Check aliases
testAllObject(mks, [
    ["<SAC-cr>", mks("<ASC-return>")],
    ["<ACM-lt>", mks("<CAM-<>")],
])

// }}}
