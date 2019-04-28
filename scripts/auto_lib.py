#!/usr/bin/env python3
"""Wraps modules to forward to content or background automatically

"""

import os
import sys

WRAPPER_FILE = '''// AUTOGENERATED FROM {filename} BY auto_lib.py
//
// Automatically forwards invocations to the appropriate context (content
// script, background script, commandline iframe)
//
// DO NOT EDIT

import * as excmd_lib from "@src/lib/excmd_lib"
import * as _excmds from "@{filename}"
export default excmd_lib.forwardedTo{source_cap}("{messagetype}", _excmds)
'''

MESSAGE_NAMES_HEADER = '''// AUTOGENERATED BY auto_lib.py
//
// Autogenerated message names for transparent context-forwarding wrappers
// created by auto_lib.py. Each of these corresponds to the wrapper for a
// single module.
//
// DO NOT EDIT
'''

MESSAGE_NAMES_FILE_PATH = "src/lib/auto_lib_wrapper_names.generated.ts"

def MangleFilename(source, filename):
    return filename.replace(source + '_auto', 'lib')

def AutoWrapperMessageName(source, filename):
    return f"auto_lib_wrapper:{filename}->{source}"

def Wrap(source, filename):
    output_filename = MangleFilename(source, filename)
    message_name = AutoWrapperMessageName(source, filename)
    with open(output_filename, 'w') as f:
        wrapper = WRAPPER_FILE.format(
            filename=filename,
            source_cap=source.title(),
            source=source,
            messagetype=message_name,
        )
        f.write(wrapper)
    return message_name

def Traverse(root):
    for root, _, filenames in os.walk(root):
        for filename in filenames:
            if filename.endswith('.ts'):
                yield os.path.join(root, filename)

def AutoLib(source, root):
    for filename in Traverse(root):
        yield Wrap(source, filename)

def WrapperNameToEnumMember(wrapper_name):
    return f'    | "{wrapper_name}"'

def WriteWrapperNamesFile(wrapper_names):
    with open(MESSAGE_NAMES_FILE_PATH, 'w') as f:
        f.write(MESSAGE_NAMES_HEADER)
        f.write("\n\n")

        for source, message_names in wrapper_names.items():
            members = "\n".join(WrapperNameToEnumMember(wn) for wn in message_names)
            f.write("export type AutoLibForwardingTo{} =\n".format(source.title()))
            f.write(WrapperNameToEnumMember("UNUSED_SENTINEL") + "\n")
            f.write(members)
            f.write("\n\n")

def main(argv):
    # unused
    del argv

    wrapper_names = {}
    for source in ['content', 'background', 'commandline']:
        wrapper_names[source] = list(AutoLib(source, os.path.join('src', source + '_auto')))

    WriteWrapperNamesFile(wrapper_names)

if __name__ == "__main__":
    main(sys.argv)
