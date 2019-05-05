#!/usr/bin/env python3
"""Force reflection upon an unwilling world.

Processes a single excmds.ts to produce a background and content version.

Objectives:
     Remove duplication of everything in excmds_content.ts
     Be kinder to the type checker
     Capture function signature and types for exmode.parser

Caveats:
    Function statements must match existing style:
        signature on a single line, ending with {
        no other statement on the same line as the end brace

"""

from collections import OrderedDict
import re
import textwrap

class Signature:
    """Extract name, parameters and types from a function signature."""
    def __init__(self, raw):
        self.raw = raw

        namematch = re.match(r".*function\s+([^(]+)", raw)
        self.name = namematch.groups()[0].strip()

        # Assume the final ) on the line ends the parameter list.
        params_list = raw[namematch.end()+1:raw.rindex(')')].split(',')
        # If func takes no args, params_list is [''], but that's not a real parameter, is it?
        if params_list == ['']: params_list = []

        # Dictionary { name: type }
        self.params = OrderedDict()

        for param in params_list:
            # Type declaration
            if ':' in param:
                name, typ = map(str.strip, param.split(':'))
                if (typ not in ('number', 'boolean', 'string', 'string[]', 'ModeName', 'AUCMDS', 'AutocmdArgs')
                        and '|' not in typ
                        and typ[0] not in ['"',"'"]
                   ):
                    raise Exception("Edit me! " + typ + " is not a supported type!")
            # Default argument
            elif '=' in param:
                name, default = map(str.strip, param.split('='))
                try:
                    float(default)
                    typ = "number"
                except ValueError:
                    if default in ("true", "false"):
                        typ = "boolean"
                    elif default[0] == default[-1] and default[0] in ('"', "'"):
                        typ = "string"
                    else:
                        raise Exception("Edit me! Only number, string and boolean defaults supported at the mo!\n\t{raw}".format(**locals()))
            else:
                raise Exception("All parameters must be typed!\n\t{raw}".format(**locals()))

            if name.endswith('?'): name = name[:-1]
            self.params[name] = typ


def get_block(lines):
    """next(lines) contains an open brace: return all the lines up to close brace.

    Moves the lines iterator, so useful for consuming a block.
    
    """
    brace_balance = 0
    block = ""
    while True:
        current_line = next(lines)
        brace_balance += current_line.count('{')
        brace_balance -= current_line.count('}')
        block += current_line
        if brace_balance == 0:
            return block


def dict_to_js(d):
    "Py dict to string that when eval'd will produce equivalent js Map"
    return "new Map(" + str(list(d.items())).replace('(','[').replace(')',']') + ")"

def content(lines, context):
    "Extract signature and, if context==background, replace function with a shim."

    block = get_block(lines)
    sig = Signature(block.split('\n')[0])
    cmd_params = "cmd_params.set('{sig.name}', ".format(**locals()) + dict_to_js(sig.params) + ")"
    message_params = ", ".join(sig.params.keys())
    if context == "background":
        # Consume and replace this block. We emit the line to add the
        # function's signature to cmd_params, the function's signature
        # line unchanged, then a command to message the browser's
        # active tab forwarding all parameters.
        return textwrap.dedent("""\
               {cmd_params}
               {sig.raw}
                   logger.debug("shimming excmd {sig.name} from background to content")
                   return Messaging.messageActiveTab(
                       "excmd_content",
                       "{sig.name}",
                       [{message_params}],
                   )
               }}\n""".format(**locals()))
    else:
        # Emit the line to add the function to cmd_params, then
        # re-emit the original block (because we consumed the block so
        # we could compute the cmd params)
        return "{cmd_params}\n{block}".format(**locals())


def background(lines, context):
    "Extract signature and, if context==content, replace function with a shim."

    block = get_block(lines)
    sig = Signature(block.split('\n')[0])
    cmd_params = "cmd_params.set('{sig.name}', ".format(**locals()) + dict_to_js(sig.params) + ")"
    message_params = ", ".join(sig.params.keys())

    if context == "background":
        # Emit the line to add the function to cmd_params, then
        # re-emit the original block (because we consumed the block so
        # we could compute the cmd params)
        return "{cmd_params}\n{block}".format(**locals())
    else:
        # Consume and replace this block. We emit the line to add the
        # function's signature to cmd_params, the function's signature
        # line unchanged, then a command to message the browser's
        # active tab forwarding all parameters.
        return textwrap.dedent("""\
               {cmd_params}
               {sig.raw}
                   logger.debug("shimming excmd {sig.name} from content to background")
                   return Messaging.message(
                       "excmd_background",
                       "{sig.name}",
                       [{message_params}],
                   )
               }}\n""".format(**locals()))

def both(lines, context):
    "Just extract the signature of the command."

    sig = Signature(next(lines))
    return "cmd_params.set('{sig.name}', ".format(**locals()) + dict_to_js(sig.params) + """)\n{sig.raw}""".format(**locals())


def omit_helper_func_factory(desired_context):
    "Consume this block if context isn't what we want"
    def inner(lines, context):
        if context != desired_context:
            # Consume this block
            get_block(lines)
        return ""

    return inner


def omit_line_factory(desired_context):
    def inner(lines, context):
        if context != desired_context:
            next(lines)
        return ""

    return inner


def main():
    """Iterate over the file, dispatching to appropriate macro handlers."""

    macros = {
            "content": content,
            "background": background,
            "both": both,
            "content_helper": omit_helper_func_factory("content"),
            "background_helper": omit_helper_func_factory("background"),
            "content_omit_line": omit_line_factory("content"),
            "background_omit_line": omit_line_factory("background"),
            }

    for context in ("background", "content"):
        with open("src/excmds.ts", encoding="utf-8") as source:
            output = PRELUDE
            lines = iter(source)
            for line in lines:
                if line.startswith("//#"):
                    macrocmd = line[3:].strip()
                    if macrocmd in macros:
                        output += macros[macrocmd](lines, context)
                    else:
                        raise Exception("Unknown macrocmd! {macrocmd}".format(**locals()))
                else:
                    output += line
            # print(output.rstrip())
            with open("src/.excmds_{context}.generated.ts".format(**locals()), "w", encoding="utf-8") as sink:
                print(output.rstrip(), file=sink)


PRELUDE = "/** Generated from excmds.ts. Don't edit this file! */"
main()
