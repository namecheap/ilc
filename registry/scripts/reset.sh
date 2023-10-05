#!/bin/bash

set -euxo pipefail

__dirname="$(dirname "$0")"

export DB_CLIENT=${DB_CLIENT:-'sqlite3'}
export DB_NAME=${DB_NAME:-'ilc'}

case $DB_CLIENT in
'sqlite3')
  rm -rf "$__dirname/../server/dbfiles/db.sqlite"
  ;;
'mysql')
  envsubst <"$__dirname/reset-mysql.sql.tpl" >"$__dirname/reset-mysql.sql"
  docker exec mysql bash /usr/src/ilc/registry/scripts/reset-mysql.sh
  ;;
'pg')
  envsubst <"$__dirname/reset-postgres.sql.tpl" >"$__dirname/reset-postgres.sql"
  docker exec postgres bash /usr/src/ilc/registry/scripts/reset-postgres.sh
  ;;
*)
  echo "Unknown DB_CLIENT $DB_CLIENT"
  exit 1
  ;;
esac
