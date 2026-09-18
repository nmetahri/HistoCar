#!/bin/sh
set -e

npm install --include-workspace-root -w packages/server
npm run prisma:generate -w packages/server
npx prisma migrate deploy --schema packages/server/prisma/schema.prisma

cd packages/server
exec npx ts-node-dev \
  --respawn \
  --transpile-only \
  --inspect=0.0.0.0:9229 \
  -r tsconfig-paths/register \
  src/index.ts
