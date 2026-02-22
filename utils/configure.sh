#!/usr/bin/env bash
set -e

# Use the Node.js version specified in .nvmrc if nvm is available.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  \. "$NVM_DIR/nvm.sh"
  nvm install
  nvm use
fi

npm install
