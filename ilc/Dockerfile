FROM node:20.8.0-alpine

RUN apk update && apk add --no-cache bash git openssh python3 make g++ findutils

# Legacy infrastructure support
RUN npm install -g stdout-mq@^2.4.0

WORKDIR /codebase

COPY package-lock.json package.json /codebase/
RUN npm ci --no-package-lock --ignore-scripts
RUN npm rebuild @newrelic/native-metrics

COPY ./ /codebase

ENV LEGACY_PLUGINS_DISCOVERY=true

RUN npm run build

ENV NODE_ENV=production

CMD ["npm", "start"]
