FROM node:12-alpine

RUN apk --no-cache add --virtual builds-deps build-base python

ADD ./ /codebase
WORKDIR /codebase

RUN npm install --no-package-lock --no-progress --ignore-scripts
RUN npm rebuild bcrypt --build-from-source
RUN npm install sqlite3 mysql
RUN npm run compile

RUN cd ./client && \
    npm install --no-package-lock --no-progress --ignore-scripts && \
    npm run build && \
    cd ..

# Legacy infrastructure support
RUN npm install -g stdout-mq@^2.4.0

CMD ["npm", "run", "start-docker"]
