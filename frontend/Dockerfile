FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json

RUN npm install

COPY frontend frontend

EXPOSE 5173

CMD ["npm", "run", "dev:frontend"]
