FROM node:20

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY index.js ./

RUN mkdir -p /app/sessions

CMD ["node", "index.js"]
