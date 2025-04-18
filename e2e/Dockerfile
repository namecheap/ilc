FROM node:20.8.0-alpine

WORKDIR /e2e

COPY package-lock.json package.json ./
RUN npm ci --no-package-lock --ignore-scripts

COPY . ./

ENV NODE_ENV=production

CMD ["npm", "run", "start:verbose"]
