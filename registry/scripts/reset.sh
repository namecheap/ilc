#!/bin/bash

set -euxo pipefail

__dirname="$(dirname "$0")"

export DB_NAME=${DB_NAME:-'ilc'}

envsubst <"$__dirname/reset-postgres.sql.tpl" >"$__dirname/reset-postgres.sql"
docker exec postgres bash /usr/src/ilc/registry/scripts/reset-postgres.sh
