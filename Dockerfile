FROM node:22-alpine

WORKDIR /application

COPY package*.json ./ 

RUN npm install
RUN npm install -g pm2

COPY . .

EXPOSE 4000

CMD ["pm2-runtime", "mealX-server.js"]
