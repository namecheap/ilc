FROM node:22-alpine

RUN apk update && apk add --no-cache bash git openssh python3 make g++ findutils

WORKDIR /codebase

COPY package-lock.json package.json /codebase/
RUN npm ci --prefer-offline --no-fund
# Integrity check. Package @newrelic/native-metrics is an optional dependency and may be not installed on alpine
RUN npm ls @newrelic/native-metrics

COPY ./ /codebase

ENV LEGACY_PLUGINS_DISCOVERY=true

RUN npm run build

ENV NODE_ENV=production

CMD ["npm", "start"]
