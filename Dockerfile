FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=10000
ENV DB_PATH=/var/data/image-converter.db

EXPOSE 10000

CMD ["npm", "start"]
