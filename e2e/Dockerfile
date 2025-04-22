FROM codeceptjs/codeceptjs

WORKDIR /e2e

COPY package-lock.json package.json ./
RUN npm ci --no-package-lock --ignore-scripts

COPY . ./

CMD ["npm", "run", "start:verbose"]
