FROM ghcr.io/puppeteer/puppeteer:23.4.1

WORKDIR /e2e

COPY package-lock.json package.json ./
RUN npm ci --no-package-lock --ignore-scripts

COPY . ./

RUN mkdir -p /e2e/.codecept_output && \
    chown -R pptruser:pptruser /e2e/.codecept_output

CMD ["npm", "run", "start:verbose"]