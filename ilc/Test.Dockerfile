# syntax=docker/dockerfile:1.7-labs
ARG BASE_IMAGE=namecheap/ilc

FROM $BASE_IMAGE AS bundle

FROM node:22-alpine3.19

RUN apk update && apk add --no-cache build-base python3 chromium chromium-chromedriver

WORKDIR /codebase

COPY --from=bundle --exclude=node_modules /codebase .

# The bundle has corepack's pnpm and its default version setting in COREPACK_HOME, so no download is needed.
# The corepack bundled with Node.js 22.12 does not know the current npm signing keys, 0.34.7 is the newest that supports 22.12.
COPY --from=bundle /usr/local/share/corepack /usr/local/share/corepack
ENV COREPACK_HOME=/usr/local/share/corepack COREPACK_DEFAULT_TO_LATEST=0
RUN npm install --global --no-fund corepack@0.34.7 && corepack enable pnpm
# The bundle has the package.json and pnpm-lock.yaml that pnpm deploy created
RUN --mount=type=cache,id=pnpm-metadata,target=/root/.cache/pnpm \
    pnpm install --frozen-lockfile

ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_DRIVER=/usr/bin/chromedriver
ENV NODE_ENV=test

CMD ["pnpm", "test:client", "--browsers", "ChromeHeadlessWithoutSecurity"]
