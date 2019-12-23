FROM node:12-alpine

RUN apk update && apk add --no-cache bash git openssh python make g++ findutils

ADD ./ /codebase
WORKDIR /codebase

RUN npm install --no-package-lock --no-progress
RUN npm run build

CMD ["npm", "start"]
