
FROM node:22-bookworm-slim

WORKDIR /app

# Install Docker CLI, Python, and native build tools for node-pty
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       docker.io \
       python3 \
       make \
       g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --omit=dev

COPY server.js ./

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 4000

CMD ["npm", "start"]
