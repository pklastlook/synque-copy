FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production
COPY . .
EXPOSE 3002
CMD ["bun", "run", "index.js"]
