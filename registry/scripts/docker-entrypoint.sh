#!/bin/sh
set -e

if [ "$DB_SEED" = 'true' ] && [ ! -f .seed ]; then
  pnpm migrate:compiled
  pnpm seed:compiled
  touch .seed
fi

exec "$@"
