FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production
COPY . .
EXPOSE 3003
CMD ["bun", "run", "index.js"]
