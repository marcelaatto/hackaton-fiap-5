FROM node:20-alpine

WORKDIR /app

# Copia os package.json de todos os workspaces para aproveitar cache do Docker
COPY package.json ./
COPY shared/package.json ./shared/
COPY services/api/package.json ./services/api/
COPY services/processor/package.json ./services/processor/
COPY services/notification/package.json ./services/notification/

# Instala todas as dependências do monorepo
RUN npm install

# Copia o código-fonte do shared e da API
COPY shared/ ./shared/
COPY services/api/ ./services/api/

WORKDIR /app/services/api

EXPOSE 3001

# Roda migrations e inicia o servidor
CMD ["sh", "-c", "npm run migrate && npm start"]
