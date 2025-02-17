FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./
COPY .env.example .env
RUN npm install

COPY . .

EXPOSE 8890