#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AZORA_LANG="$(cd "$SCRIPT_DIR/../azora-lang" && pwd)"
VERSION="$(node -p "require('./package.json').version")"
DEST="$SCRIPT_DIR/public/wasm/$VERSION"
AZLS_DEST="$SCRIPT_DIR/public/azls/$VERSION"
ENGINE_DEST="$SCRIPT_DIR/public/engine/$VERSION"
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

echo "Building Azora Engine WASM runtime..."
mkdir -p "$ENGINE_DEST"
rm -rf "$ENGINE_DEST"/*
cp "$ENGINE_SOURCE/render.az" "$ENGINE_DEST/render.az"
cp "$ENGINE_SOURCE/shaders.az" "$ENGINE_DEST/shaders.az"
cp "$ENGINE_SOURCE/input.az" "$ENGINE_DEST/input.az"

echo "Compiler, AZLS, and Engine WASM bundles built and copied successfully."
ls -la "$DEST"
ls -la "$AZLS_DEST"
ls -la "$ENGINE_DEST"
