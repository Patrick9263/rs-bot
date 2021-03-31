FROM node:alpine
WORKDIR /src

COPY package* .
RUN npm ci
COPY . /src

CMD ["node", "index.js"]
