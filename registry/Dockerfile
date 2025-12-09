FROM node:22-alpine

RUN apk --no-cache add --virtual builds-deps build-base python3 py3-setuptools && \
    ln -sf python3 /usr/bin/python

WORKDIR /codebase

COPY package-lock.json package.json /codebase/
RUN npm ci --prefer-offline --no-fund
# Integrity check. Package @newrelic/native-metrics is an optional dependency and may be not installed on alpine
RUN npm ls @newrelic/native-metrics

COPY client/package-lock.json client/package.json /codebase/client/
RUN cd ./client && npm ci

ADD ./ /codebase

RUN npm run build

ENTRYPOINT ["sh", "./scripts/docker-entrypoint.sh"]

CMD ["npm", "run", "start-docker"]
