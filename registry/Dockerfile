FROM node:12-alpine

RUN apk update && apk add --no-cache bash git openssh python make g++ findutils

ADD ./ /codebase
WORKDIR /codebase

RUN npm install --no-package-lock --no-progress --ignore-scripts
RUN npm install sqlite3 mysql
RUN npm run compile

# Legacy infrastructure support
RUN npm install -g stdout-mq@^2.2.0

CMD ["npm", "run", "start-docker"]
