# syntax=docker/dockerfile:1.7-labs
ARG BASE_IMAGE=namecheap/ilc

FROM $BASE_IMAGE AS bundle

FROM node:22-alpine3.19

RUN apk update && apk add --no-cache build-base python3 chromium chromium-chromedriver

WORKDIR /codebase

COPY --from=bundle --exclude=node_modules /codebase .

RUN npm ci --prefer-offline --no-fund

ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_DRIVER=/usr/bin/chromedriver
ENV NODE_ENV=test

CMD ["npm", "run", "test:client", "--", "--browsers", "ChromeHeadlessWithoutSecurity"]
