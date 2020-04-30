FROM node:12-alpine AS build-stage

RUN apk update && apk add --no-cache bash git openssh python make g++ findutils

COPY ./ /temporary
WORKDIR /temporary

RUN npm install --no-package-lock --no-progress
RUN npm run build

FROM node:12-alpine AS release-stage

ENV NODE_ENV=production

# Legacy infrastructure support
RUN npm install -g stdout-mq@^2.4.0

WORKDIR /codebase

COPY ./package.json ./package.json
COPY ./newrelic.js ./newrelic.js
COPY ./server ./server
COPY ./common ./common
COPY ./config ./config

COPY --from=build-stage /temporary/public ./public
COPY --from=build-stage /temporary/node_modules ./node_modules

CMD ["npm", "start"]
