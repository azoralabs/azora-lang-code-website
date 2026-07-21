#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AZORA_LANG="$(cd "$SCRIPT_DIR/../azora-lang" && pwd)"
VERSION="$(node -p "require('./package.json').version")"
DEST="$SCRIPT_DIR/public/wasm/$VERSION"
AZLS_DEST="$SCRIPT_DIR/public/azls/$VERSION"

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

echo "Compiler and AZLS WASM bundles built and copied successfully."
ls -la "$DEST"
ls -la "$AZLS_DEST"
