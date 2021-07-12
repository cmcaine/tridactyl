#!/bin/sh

set -e

for arg in "$@"
do
    case $arg in
        --quick)
            QUICK_BUILD=1
            shift
            ;;
        --old-native)
            OLD_NATIVE=1
            shift
            ;;
    esac
done

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

# You can use `--quick` to test out small changes without updating docs / metadata etc.
# If you get weird behaviour just run a full build
if [ "$QUICK_BUILD" != "1" ]; then

    # .bracketexpr.generated.ts is needed for metadata generation
    "$(yarn bin)/nearleyc" src/grammars/bracketexpr.ne > \
      src/grammars/.bracketexpr.generated.ts

    # It's important to generate the metadata before the documentation because
    # missing imports might break documentation generation on clean builds
    "$(yarn bin)/esbuild" --target=node10 --platform=node --bundle compiler/gen_metadata.ts > compiler/gen_metadata.js \
    && node compiler/gen_metadata.js \
              --out src/.metadata.generated.ts \
              --themeDir src/static/themes \
              src/excmds.ts src/lib/config.ts

    scripts/newtab.md.sh
    scripts/make_tutorial.sh
    scripts/make_docs.sh

    tsc --project tsconfig.json --noEmit
else

    echo "Warning: dirty rebuild. Skipping docs, metadata and type checking..."

fi

# Actually build the thing

mkdir -p buildtemp
node scripts/esbuild.js
mv buildtemp/* build/
rmdir buildtemp

# Copy extra static files across

cp src/manifest.json build/
cp -r src/static build
cp -r generated/static build
cp issue_template.md build/

# Remove large unused files

rm build/static/logo/Tridactyl.psd
rm build/static/logo/Tridactyl_1024px.png

# "temporary" fix until we can install new native on CI: install the old native messenger
if [ "$OLD_NATIVE" = "1" ]; then
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
