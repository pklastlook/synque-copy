FROM node:20

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY index.js ./

ENV PORT=3004
EXPOSE 3004

CMD ["node", "index.js"]
