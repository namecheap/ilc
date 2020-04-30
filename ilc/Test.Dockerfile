FROM node:12-alpine AS test-stage

RUN apk update && apk add --no-cache bash git openssh python make g++ findutils chromium chromium-chromedriver

ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_DRIVER=/usr/bin/chromedriver

COPY ./ /temporary
WORKDIR /temporary

RUN npm install --no-package-lock --no-progress
RUN npm run test
RUN npm run test:coverage
RUN npm run test:client -- --browsers ChromeHeadlessWithoutSecurity

FROM scratch AS export-artifacts-stage

WORKDIR /artifacts

COPY --from=test-stage /temporary/.karma_output/coverage ./client/coverage
COPY --from=test-stage /temporary/.nyc_output/coverage ./server/coverage
