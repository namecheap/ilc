FROM node:20.8.0-alpine

RUN apk --no-cache add --virtual builds-deps build-base python3 && \
    ln -sf python3 /usr/bin/python

# Legacy infrastructure support
RUN npm install -g stdout-mq@^2.4.0

WORKDIR /codebase

COPY package-lock.json package.json /codebase/
RUN npm ci

COPY client/package-lock.json client/package.json /codebase/client/
RUN cd ./client && npm ci

ADD ./ /codebase

RUN npm run build

ENTRYPOINT ["sh", "./scripts/docker-entrypoint.sh"]

CMD ["npm", "run", "start-docker"]
