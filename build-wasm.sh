#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AZORA_LANG="$(cd "$SCRIPT_DIR/../azora-lang" && pwd)"
# The playground loads the version src/engine/versions.js marks as default, so
# the bundle is built into that folder (package.json's version is the site's).
VERSION="${1:-$(cd "$SCRIPT_DIR" && node --input-type=module -e "import('./src/engine/versions.js').then((m) => console.log(m.getDefaultVersion()))")}"
DEST="$SCRIPT_DIR/public/wasm/$VERSION"
AZLS_DEST="$SCRIPT_DIR/public/azls/$VERSION"
ENGINE_SOURCE="$SCRIPT_DIR/src/engine/libraries/$VERSION"

echo "Building WASM bundle for Azora $VERSION..."
cd "$AZORA_LANG"
./gradlew :compiler:wasmJsBrowserDistribution

SRC="$AZORA_LANG/compiler/build/dist/wasmJs/productionExecutable"

if [ ! -d "$SRC" ]; then
    echo "ERROR: Build output not found at $SRC"
    exit 1
fi

echo "Copying WASM bundle to $DEST..."
mkdir -p "$DEST"
rm -rf "$DEST"/*
cp "$SRC"/* "$DEST"/

echo "Building the Azora-written language server..."
"$AZORA_LANG/azls/build-wasm.sh" "$AZLS_DEST"
node "$SCRIPT_DIR/scripts/build-stdlib-manifest.mjs" "$VERSION"

# The Engine libraries are bundled from $ENGINE_SOURCE by Vite
# (src/engine/engineWasmLoader.js); there is nothing to copy for them.
for library in render.az shaders.az input.az; do
    [ -f "$ENGINE_SOURCE/$library" ] || { echo "ERROR: $ENGINE_SOURCE/$library is missing" >&2; exit 1; }
done

echo "Compiler and AZLS bundles built and copied successfully."
ls -la "$DEST"
ls -la "$AZLS_DEST"
