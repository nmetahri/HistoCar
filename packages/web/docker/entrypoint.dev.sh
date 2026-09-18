#!/bin/sh
set -e

npm install --include-workspace-root -w packages/web

cd packages/web
exec npx vite --host 0.0.0.0 --port 5173
