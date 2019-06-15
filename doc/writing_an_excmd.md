## What makes an excmd

1. A function in [`excmds.ts`](../src/excmds.ts) annotated with `//#both`
2. A documentation comment for that function
3. The implementation

The first item "declares" the excmd, allowing it to be invoked from Tridactyl's command-line and providing an entry-point into the implementation. The second item provides documentation (e.g. `:help <your excmd>`). The last is what actually does the work.

### Declaration

#### Signature

The signature of your excmd's declaration function will be extracted by [`excmd_macros.py`](../scripts/excmd_macros.py) to drive command-line completion. Note that this is accomplished by string-mangling rather than semantic analysis, so there are some odd constraints. The entire function declaration (from `export` to the opening curly `{` for the body of the function) must be on one line. Only a few types are supported: `number`, `boolean`, `string`, `string[]`, `ModeName`, [string literal types](https://www.typescriptlang.org/docs/handbook/advanced-types.html), and unions of those. Note that string literal types must be inlined:

```typescript
// This won't work!
type ArgType = "foo" | "bar" | number
export function badexcmd(first_arg: ArgType) { }

// you have to do it like this:
export function goodexcmd(first_arg: "foo" | "bar" | number) { }
```

The function may be either sync or async.

```typescript
// These are both fine
export function syncexcmd() { }
export async function asyncexcmd() { }
```

The function must be exported.

#### Annotation

WebExtensions are broken into two major components, the background script and the content script. You should read this page on MDN: [Anatomy of a WebExtension](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Anatomy_of_a_WebExtension).

Tridactyl can run excmds in either context. In addition to extracting the signature for completion, [`excmd_macros.py`](../scripts/excmd_macros.py) splits [`excmds.ts`](../src/excmds.ts) into one version that runs in each tab's content script and one version that runs in Tridactyl's background script. Historically, you would annotate  your excmd to make sure it ended up in the right place. However, we've recently moved to a new system for making sure things happen in the right context, so you can just annotate your excmd's declaration with `//#both`:

```typescript
//#both
export function yourexcmd() {}
```

### Documentation

Tridactyl builds the `:help` page, and provides inline help when completing an excmd in the command-line, by running [TypeDoc](https://github.com/TypeStrong/typedoc) on [`excmds.ts`](../src/excmds.ts). You will need to add a documentation comment to the function which declares your excmd so that information about it appears on `:help`.

### Implementation

To help us move toward a future without hacks like [`excmd_macros.py`](../scripts/excmd_macros.py), we're currently trying to move all of the actual code out of `excmds.ts`. Additionally, as many WebExtension APIs are only available in either the background or content scripts but not both (e.g. [`tabs`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs) is background-only), you need some way to run your excmd in the right context.

This mechanism is provided by the [`content_lib`](../src/content_lib) and [`background_lib`](../src/background_lib) directories. For each context-specific module in these directories, an "ambidextrous" module will be generated in [`lib/generated`](../src/lib/generated) that either invokes the original function (if in the correct context) or inserts a shim which automatically forwards invocations to the right context using [an appropriate messaging API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/sendMessage)). You can put the implementation of your excmd in `background`, `content`, and `lib` and handle the details yourself if need or want to, but for the most part you should stick with the automatic forwarding.

If your excmd fits into an established module (e.g. [`background_lib/tabs.ts`](../src/background_lib/tabs.ts)) you can put your implementation there. Otherwise, you can create a new module patterned after one of those. If necessary, import the "ambidextrous" wrapper module (the generated one in `src/lib/generated`) at the top of `excmds.ts`, in the portion marked `// Import excmd libs`. Then invoke the implementation in the declaration function you added earlier and you're done!

## A complete example:

> `src/background_lib/your_module.ts`
```typescript
type Thingy:
    | "A_THING"
    | "DIFF_THING"

export async function doTheThing(arg1: string, arg2: Thingy) {
    // ... lots of code here, maybe invoke helper functions, etc.
}
```

> `src/excmds.ts`
```typescript
import excmd_yours from "@src/lib/generated/your_module"

// ...

/**
 * Does a thing.
 *
 * @param arg1 The first argument, which does something
 * @param arg2 Does one thing if A_THING or something else if DIFF_THING
 */
//#both
export async function yourexcmd(arg1: string, arg2: "A_THING" | "DIFF_THING") {
    return excmd_yours.yourexcmd(arg1, arg2)
}
```

Note the annotation between the TypeDoc comment and the function. Note that you're creating your module in `background_lib` but importing from `lib/generated`. Note that the excmd declaration in `excmds.ts` is complete in this example; all of the code should be in `your_module.ts`. Note that the union of string literal types can be used as intended in the module but has to be manually expanded in the declaration function's signature.
