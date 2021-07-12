import * as ts from "typescript"
import * as fs from "fs"
import commandLineArgs from "command-line-args"
import * as AllTypes from "./types/AllTypes"
import * as AllMetadata from "./metadata/AllMetadata"

export function toSimpleType(typeNode) {
    switch (typeNode.kind) {
        case ts.SyntaxKind.VoidKeyword:
            return new AllTypes.VoidType()
        // IndexedAccessTypes are things like `fn<T keyof Class>(x: T, y: Class[T])`
        // This doesn't seem to be easy to deal with so let's kludge it for now
        case ts.SyntaxKind.IndexedAccessType:
        // Unknown is just like any, but slightly stricter
        case ts.SyntaxKind.UnknownKeyword:
        case ts.SyntaxKind.AnyKeyword:
            return new AllTypes.AnyType()
        case ts.SyntaxKind.BooleanKeyword:
            return new AllTypes.BooleanType()
        case ts.SyntaxKind.NumberKeyword:
            return new AllTypes.NumberType()
        case ts.SyntaxKind.ObjectKeyword:
            return new AllTypes.ObjectType()
        case ts.SyntaxKind.StringKeyword:
            return new AllTypes.StringType()
        case ts.SyntaxKind.Parameter:
            let n = toSimpleType(typeNode.type)
            n.name = typeNode.name.original.escapedText
            n.isDotDotDot = !!typeNode.dotDotDotToken
            n.isQuestion = !!typeNode.questionToken
            return n
        case ts.SyntaxKind.TypeReference:
            if (!typeNode.typeArguments) {
                // If there are no typeArguments, this is not a parametric type and we can return the type directly
                try {
                    return toSimpleType(
                        typeNode.typeName.symbol.declarations[0].type,
                    )
                } catch (e) {
                    // Fall back to what you'd do with typeArguments
                }
            }
            let args = typeNode.typeArguments
                ? typeNode.typeArguments.map(t =>
                      toSimpleType(typeNode.typeArguments[0]),
                  )
                : []
            return new AllTypes.TypeReferenceType(
                typeNode.typeName.escapedText,
                args,
            )
        case ts.SyntaxKind.FunctionType:
            // generics = (typeNode.typeParameters || []).map(p => new AllTypes.SimpleType(p))
            return new AllTypes.FunctionType(
                typeNode.parameters.map(p => toSimpleType(p)),
                toSimpleType(typeNode.type),
            )
        case ts.SyntaxKind.TypeLiteral:
            let members = typeNode.members
                .map(member => {
                    if (member.kind == ts.SyntaxKind.IndexSignature) {
                        // Something like this: { [str: string]: string[] }
                        return ["", toSimpleType(member.type)]
                    }
                    // Very fun feature: when you have an object literal with >20 members, typescript will decide to replace some of them with a "... X more ..." node that obviously doesn't have a corresponding symbol, hence this check and the filter after the map
                    if (member.name.symbol)
                        return [
                            member.name.symbol.escapedName,
                            toSimpleType(member.type),
                        ]
                })
                .filter(m => m)
            return new AllTypes.ObjectType(new Map(members))
        case ts.SyntaxKind.ArrayType:
            return new AllTypes.ArrayType(toSimpleType(typeNode.elementType))
        case ts.SyntaxKind.TupleType:
            return new AllTypes.TupleType(
                typeNode.elementTypes.map(t => toSimpleType(t)),
            )
        case ts.SyntaxKind.UnionType:
            return new AllTypes.UnionType(
                typeNode.types.map(t => toSimpleType(t)),
            )
            break
        case ts.SyntaxKind.LiteralType:
            return new AllTypes.LiteralTypeType(typeNode.literal.text)
            break
        default:
            console.log(typeNode)
            throw new Error(`Unhandled kind (${typeNode.kind}) for ${typeNode}`)
    }
}

/** True if node is visible outside its file, false otherwise */
function isNodeExported(node: ts.Node): boolean {
    return (
        (ts.getCombinedModifierFlags(<ts.Declaration>node) &
            ts.ModifierFlags.Export) !==
            0 ||
        (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
    )
}

/** True if node is marked as @hidden in its documentation */
function isNodeHidden(sourceFile, node): boolean {
    return (
        sourceFile &&
        node.jsDoc &&
        !!node.jsDoc.find(
            doc =>
                sourceFile.text.slice(doc.pos, doc.end).search("@hidden") != -1,
        )
    )
}

function visit(
    checker: any,
    sourceFile: any,
    file: AllMetadata.FileMetadata,
    node: any,
) {
    let symbol = checker.getSymbolAtLocation(node.name)
    if (symbol && isNodeExported(node)) {
        let nodeName = symbol.escapedName

        switch (node.kind) {
            case ts.SyntaxKind.FunctionDeclaration:
                // Grab the doc, default to empty string
                let doc =
                    ts.displayPartsToString(symbol.getDocumentationComment()) ||
                    ""
                // Grab the type
                let ttype = checker.getTypeOfSymbolAtLocation(
                    symbol,
                    symbol.valueDeclaration!,
                )
                // If the function has a type, try to convert it, if it doesn't, default to any
                let t = ttype
                    ? toSimpleType(checker.typeToTypeNode(ttype))
                    : new AllTypes.AnyType()
                file.setFunction(
                    nodeName,
                    new AllMetadata.SymbolMetadata(
                        doc,
                        t,
                        isNodeHidden(sourceFile, node),
                    ),
                )
                return

            case ts.SyntaxKind.ClassDeclaration:
                let clazz = file.getClass(nodeName)
                if (!clazz) {
                    clazz = new AllMetadata.ClassMetadata()
                    file.setClass(nodeName, clazz)
                }
                symbol.members.forEach((sym, name, map) => {
                    // Can't get doc/type from these special functions
                    // Or at least, it requires work that might not be needed for now
                    if (["__constructor", "get", "set"].includes(name)) return

                    // Grab the doc, default to empty string
                    let doc =
                        ts.displayPartsToString(
                            sym.getDocumentationComment(),
                        ) || ""
                    // Grab the type
                    let ttype = checker.getTypeOfSymbolAtLocation(
                        sym,
                        sym.valueDeclaration!,
                    )
                    // If the function has a type, try to convert it, if it doesn't, default to any
                    let t = ttype
                        ? toSimpleType(checker.typeToTypeNode(ttype))
                        : new AllTypes.AnyType()
                    clazz.setMember(
                        name,
                        new AllMetadata.SymbolMetadata(
                            doc,
                            t,
                            isNodeHidden(sourceFile, node),
                        ),
                    )
                })
                return

            // Other declaration syntaxkinds:
            // case ts.SyntaxKind.VariableDeclaration:
            // case ts.SyntaxKind.VariableDeclarationList:
            // case ts.SyntaxKind.PropertyDeclaration:
            // case ts.SyntaxKind.MethodDeclaration:
            // case ts.SyntaxKind.EndOfDeclarationMarker:
            // case ts.SyntaxKind.MergeDeclarationMarker:
            // case ts.SyntaxKind.MissingDeclaration:
            // case ts.SyntaxKind.ClassExpression:
            // case ts.SyntaxKind.InterfaceDeclaration:
            // case ts.SyntaxKind.TypeAliasDeclaration:
            // case ts.SyntaxKind.EnumDeclaration:
            // case ts.SyntaxKind.ModuleDeclaration:
            // case ts.SyntaxKind.ImportEqualsDeclaration:
            // case ts.SyntaxKind.ImportDeclaration:
            // case ts.SyntaxKind.NamespaceExportDeclaration:
            // case ts.SyntaxKind.ExportDeclaration:
            // case ts.SyntaxKind.Constructor:
        }
    }

    ts.forEachChild(node, node => visit(checker, sourceFile, file, node))
}

function generateMetadata(
    out: string,
    themedir: string,
    fileNames: string[],
): void {
    /* Parse Tridactyl */
    let program = ts.createProgram(fileNames, {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS,
    })

    let metadata = new AllMetadata.ProgramMetadata()

    for (const sourceFile of program.getSourceFiles()) {
        let name = (fileNames as any).find(name =>
            sourceFile.fileName.match(name),
        )
        if (name) {
            let file = metadata.getFile(name)
            if (!file) {
                file = new AllMetadata.FileMetadata()
                metadata.setFile(name, file)
            }
            visit(program.getTypeChecker(), sourceFile, file, sourceFile)
        }
    }

    // We need to specify Type itself because it won't exist in AllTypes.js since it's an interface
    let imports =
        `import { Type } from "../compiler/types/AllTypes"\n` +
        `import {${Object.keys(AllTypes).join(
            ", ",
        )}} from "../compiler/types/AllTypes"\n` +
        `import {${Object.keys(AllMetadata).join(
            ", ",
        )}} from "../compiler/metadata/AllMetadata"\n`

    let metadataString =
        imports + `\nexport let everything = ${metadata.toConstructor()}\n`

    if (themedir) {
        metadataString += `\nexport let staticThemes = ${JSON.stringify(
            fs.readdirSync(themedir),
        )}\n`
    }

    // print out the doc
    fs.writeFileSync(out, metadataString)

    return
}

let opts = commandLineArgs([
    { name: "out", type: String },
    { name: "themeDir", type: String },
    { name: "src", type: String, multiple: true, defaultOption: true },
])

if (!opts.out || opts.src.length < 1)
    throw new Error(
        "Argument syntax: --out outfile [--src] file1.ts [file2.ts ...]",
    )

generateMetadata(opts.out, opts.themeDir, opts.src)
