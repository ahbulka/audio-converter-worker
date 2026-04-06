FROM node:20-slim

# Install FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app files
COPY . .

# Create uploads directory
RUN mkdir -p /tmp/uploads

EXPOSE 3000

CMD ["npm", "start"]
