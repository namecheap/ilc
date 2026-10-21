#!/bin/bash

set -eo pipefail

prefix=${1:?"Usage: bash registry-coverage-report.sh <src|dest>"}

docker run --rm -v "$(pwd)/$prefix-registry-tests-artifacts":/codebase/.nyc_output "namecheap/ilc_tmp:reg_${GITHUB_SHA:0:7}" pnpm exec nyc report
