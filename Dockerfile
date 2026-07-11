FROM node:20-slim
WORKDIR /app

# install deps (tsx is a dev dep, so install all)
COPY package*.json ./
RUN npm install

COPY . .

# health server binds $PORT; provider keeps the CAP WebSocket alive 24/7
CMD ["npm", "run", "provider"]
