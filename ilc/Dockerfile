FROM node:12-alpine

RUN apk update && apk add --no-cache bash git openssh python make g++ findutils

ADD ./ /codebase
WORKDIR /codebase

RUN npm install --no-package-lock --no-progress
RUN npm run build

# Legacy infrastructure support
RUN npm install -g stdout-mq@^2.1.0

CMD ["npm", "start"]
