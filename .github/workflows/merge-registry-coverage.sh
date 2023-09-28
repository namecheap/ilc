#!/bin/bash

set -eo pipefail

prefix=${1:?"Usage: bash merge-registry-coverage.sh <src|dest>"}
suffix="registry-tests-artifacts"
mkdir -p "$prefix-merged-$suffix"
cp -R \
  "$prefix-sqlite3-$suffix/." \
  "$prefix-mysql-$suffix/." \
  "$prefix-pg-$suffix/." \
  "$prefix-merged-$suffix"

docker run --rm -v "$(pwd)/$prefix-merged-$suffix":/codebase/.nyc_output "namecheap/ilc_tmp:reg_${GITHUB_SHA:0:7}" npx nyc report
