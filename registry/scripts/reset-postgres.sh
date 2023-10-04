#!/bin/bash

set -eo pipefail

__dirname="$(dirname "$0")"
psql -U root -d postgres -a -f "$__dirname/reset-postgres.sql"
