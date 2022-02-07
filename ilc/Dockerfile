FROM node:14-alpine

RUN apk update && apk add --no-cache bash git openssh python3 make g++ findutils

# Legacy infrastructure support
RUN npm install -g stdout-mq@^2.4.0

WORKDIR /codebase

COPY package-lock.json package.json /codebase/
RUN npm ci --no-package-lock --ignore-scripts

COPY ./ /codebase

RUN npm run build

ENV NODE_ENV=production

CMD ["npm", "start"]
