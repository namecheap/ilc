ARG BASE_IMAGE=namecheap/ilc

FROM $BASE_IMAGE

RUN apk update && apk add --no-cache chromium chromium-chromedriver

ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_DRIVER=/usr/bin/chromedriver
ENV NODE_ENV=test

CMD ["npm", "run", "test:client"]
