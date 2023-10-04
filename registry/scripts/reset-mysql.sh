#!/bin/bash

set -eo pipefail

__dirname="$(dirname "$0")"
mysql -uroot -ppwd < "$__dirname/reset-mysql.sql"
