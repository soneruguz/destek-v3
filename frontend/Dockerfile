FROM node:16-alpine

WORKDIR /app

# System setup and permissions
RUN apk add --no-cache shadow tzdata && \
    cp /usr/share/zoneinfo/Europe/Istanbul /etc/localtime && \
    echo "Europe/Istanbul" > /etc/timezone && \
    mkdir -p /app/node_modules /app/node_modules/.cache && \
    chmod -R 777 /app/node_modules

# Copy package files
COPY package*.json ./

# Install dependencies as root
RUN npm install && \
    npm cache clean --force && \
    chmod -R 777 /app/node_modules

# Copy application code
COPY . .

# Ensure .cache directory exists and has correct permissions
RUN mkdir -p /app/node_modules/.cache && \
    chmod -R 777 /app/node_modules/.cache && \
    # Create .eslintcache file with write permissions for everyone
    touch /app/node_modules/.cache/.eslintcache && \
    chmod 666 /app/node_modules/.cache/.eslintcache

# Command to run the app
CMD ["sh", "-c", "mkdir -p /app/node_modules/.cache && chmod -R 777 /app/node_modules/.cache && npm start"]
