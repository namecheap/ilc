FROM node:12-alpine AS build

RUN apk update && apk add --no-cache bash git openssh python make g++ findutils chromium chromium-chromedriver

ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_DRIVER=/usr/bin/chromedriver

ADD ./ /temporary
WORKDIR /temporary

RUN npm install --no-package-lock --no-progress
RUN npm run test
RUN npm run test:client -- --browsers ChromeHeadlessWithoutSecurity
RUN npm run build

FROM node:12-alpine AS release

# Legacy infrastructure support
RUN npm install -g stdout-mq@^2.4.0

ADD ./ /codebase
WORKDIR /codebase

COPY --from=build /temporary/package.json ./package.json
COPY --from=build /temporary/server ./server
COPY --from=build /temporary/common ./common
COPY --from=build /temporary/public ./public
COPY --from=build /temporary/config ./config

RUN npm install --no-package-lock --no-progress --production

CMD ["npm", "start"]
