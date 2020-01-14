FROM node:12-alpine

RUN apk update && apk add --no-cache bash git openssh python make g++ findutils

ADD ./ /codebase
WORKDIR /codebase

RUN npm install --no-package-lock --no-progress --ignore-scripts
RUN npm install sqlite3 mysql
RUN npm run compile

CMD ["npm", "run", "start-docker"]
