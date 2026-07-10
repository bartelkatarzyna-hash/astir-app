FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
COPY backend/prisma backend/prisma

RUN npm install

COPY backend backend

EXPOSE 3000

CMD ["npm", "run", "start:dev", "--workspace", "backend"]
