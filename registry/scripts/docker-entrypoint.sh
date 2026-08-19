#!/bin/sh
set -e

if [ "$DB_SEED" = 'true' ] && [ ! -f .seed ]; then
  npm run migrate:compiled
  npm run seed:compiled
  touch .seed
fi

exec "$@"
