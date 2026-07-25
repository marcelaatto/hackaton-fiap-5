FROM node:20-alpine

# FFmpeg é necessário para extração de frames
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copia os package.json de todos os workspaces
COPY package.json ./
COPY shared/package.json ./shared/
COPY services/api/package.json ./services/api/
COPY services/processor/package.json ./services/processor/
COPY services/notification/package.json ./services/notification/

RUN npm install

# Copia o código-fonte do shared e do processor
COPY shared/ ./shared/
COPY services/processor/ ./services/processor/

WORKDIR /app/services/processor

CMD ["npm", "start"]
