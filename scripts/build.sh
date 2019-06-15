#!/bin/sh

set -e

CLEANSLATE="node_modules/cleanslate/docs/files/cleanslate.css"
TRIDACTYL_LOGO="src/static/logo/Tridactyl_64px.png"

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
  $WIN_PYTHON scripts/auto_lib.py
else
  scripts/excmds_macros.py
  scripts/auto_lib.py
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

scripts/newtab.md.sh
scripts/make_tutorial.sh
scripts/make_docs.sh

if [ "$(isWindowsMinGW)" = "True" ]; then
  powershell \
    -NoProfile \
    -InputFormat None \
    -ExecutionPolicy Bypass \
    native/win_install.ps1 -DebugDirBase native
else
  native/install.sh local
fi

(webpack --display errors-only --bail\
  && scripts/git_version.sh)

scripts/bodgecss.sh
scripts/authors.sh

if [ -e "$CLEANSLATE" ] ; then
	cp -v "$CLEANSLATE" build/static/css/cleanslate.css
else
	echo "Couldn't find cleanslate.css. Try running 'yarn install'"
fi

if [ -e "$TRIDACTYL_LOGO" ] ; then
    # sed and base64 take different arguments on Mac
    case "$(uname)" in
      Darwin*) sed -i "" "s@REPLACE_ME_WITH_BASE64_TRIDACTYL_LOGO@$(base64 "$TRIDACTYL_LOGO")@" build/static/themes/default/default.css;;
      *BSD) sed -in "s@REPLACE_ME_WITH_BASE64_TRIDACTYL_LOGO@$(base64 "$TRIDACTYL_LOGO" | tr -d '\r\n')@" build/static/themes/default/default.css;;
      *) sed "s@REPLACE_ME_WITH_BASE64_TRIDACTYL_LOGO@$(base64 --wrap 0 "$TRIDACTYL_LOGO")@" -i build/static/themes/default/default.css;;
    esac
else
	echo "Couldn't find Tridactyl logo ($TRIDACTYL_LOGO)"
fi
