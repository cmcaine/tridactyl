#!/bin/sh

set -e

CLEANSLATE="node_modules/cleanslate/docs/files/cleanslate.css"

isWindowsMinGW() {
  is_mingw="False"
  if [ "$(uname | cut -c 1-5)" = "MINGW" ] \
    || [ "$(uname | cut -c 1-4)" = "MSYS" ]; then
    is_mingw="True"
  fi

  printf "%s" "${is_mingw}"
}

if [ "$(isWindowsMinGW)" = "True" ]; then
  WIN_PYTHON="py -3"
  YARN_BIN_DIR="$(cygpath "$(yarn bin)")"
  PATH=$YARN_BIN_DIR:$PATH
else
  PATH="$(yarn bin):$PATH"
fi

export PATH

mkdir -p build
mkdir -p build/static
mkdir -p generated/static
mkdir -p generated/static/clippy

if [ "$(isWindowsMinGW)" = "True" ]; then
  $WIN_PYTHON scripts/excmds_macros.py
else
  scripts/excmds_macros.py
fi

# .bracketexpr.generated.ts is needed for metadata generation
"$(yarn bin)/nearleyc" src/grammars/bracketexpr.ne > \
  src/grammars/.bracketexpr.generated.ts

# It's important to generate the metadata before the documentation because
# missing imports might break documentation generation on clean builds
"$(yarn bin)/tsc" compiler/gen_metadata.ts -m commonjs --target es2017 \
  && node compiler/gen_metadata.js \
          --out src/.metadata.generated.ts \
          --themeDir src/static/themes \
          src/excmds.ts src/lib/config.ts

# Skip docs to speed up build times. Only works on rebuilds.
if [ "$1" = "--no-docs" ]; then
  echo "Skipping docs..."
else
  scripts/newtab.md.sh
  scripts/make_tutorial.sh
  scripts/make_docs.sh
fi

webpack --stats errors-only --bail

# "temporary" fix until we can install new native on CI: install the old native messenger
if [ "$1" = "--old-native" ]; then
    if [ "$(isWindowsMinGW)" = "True" ]; then
      powershell \
        -NoProfile \
        -InputFormat None \
        -ExecutionPolicy Bypass \
        native/win_install.ps1 -DebugDirBase native
    else
      native/install.sh local
    fi
fi

scripts/authors.sh

if [ -e "$CLEANSLATE" ] ; then
	cp -v "$CLEANSLATE" build/static/css/cleanslate.css
else
	echo "Couldn't find cleanslate.css. Try running 'yarn install'"
fi
