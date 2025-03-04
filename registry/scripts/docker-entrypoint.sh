#!/bin/sh
set -e

if [ "$DB_SEED" = 'true' ] && [ ! -f .seed ]; then
  npm run migrate
  npm run seed
  touch .seed
fi

exec "$@"
