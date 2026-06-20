#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AZORA_LANG="$(cd "$SCRIPT_DIR/../azora-lang" && pwd)"
VERSION="0.0.1-alpha.2"
DEST="$SCRIPT_DIR/public/wasm/$VERSION"

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

echo "WASM bundle built and copied successfully."
ls -la "$DEST"
