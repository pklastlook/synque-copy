FROM node:20-slim

WORKDIR /app

# Copy package files + install deps
COPY package.json ./
RUN npm install --production

# Copy the pre-built bundled index.js (Prisma client is inlined)
COPY index.js ./

# Railway sets PORT env var automatically
ENV PORT=3003
EXPOSE 3003

# Start the service
CMD ["node", "index.js"]
