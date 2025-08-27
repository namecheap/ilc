#!/bin/sh
set -e

if [ "$DB_SEED" = 'true' ] && [ ! -f .seed ]; then
  npm run migrate
  npm run seed
  touch .seed
fi

sed -i "s/<%PROTECTED_SETTING%>/$ILC_REGISTRY_ADMIN_PROTECTED_SETTINGS/g" /codebase/client/dist/*.js

exec "$@"
