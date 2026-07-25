FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY shared/package.json ./shared/
COPY services/api/package.json ./services/api/
COPY services/processor/package.json ./services/processor/
COPY services/notification/package.json ./services/notification/

RUN npm install

COPY shared/ ./shared/
COPY services/notification/ ./services/notification/

WORKDIR /app/services/notification

CMD ["npm", "start"]
