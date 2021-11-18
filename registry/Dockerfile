FROM node:14-alpine

RUN apk --no-cache add --virtual builds-deps build-base python3

# Legacy infrastructure support
RUN npm install -g stdout-mq@^2.4.0

ADD ./ /codebase
WORKDIR /codebase

RUN npm install --no-package-lock --no-progress --ignore-scripts
RUN npm rebuild bcrypt --build-from-source
RUN npm install sqlite3 mysql

RUN cd ./client && npm install --no-progress --ignore-scripts

RUN npm run build

CMD ["npm", "run", "start-docker"]
