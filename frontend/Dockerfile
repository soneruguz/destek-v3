FROM node:16-alpine AS builder

ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

WORKDIR /app

# System setup
RUN apk add --no-cache shadow tzdata && \
    cp /usr/share/zoneinfo/Europe/Istanbul /etc/localtime && \
    echo "Europe/Istanbul" > /etc/timezone

# Copy package files
COPY ./frontend/package*.json ./

# Install dependencies
RUN npm install && \
    npm cache clean --force

# Copy application code
COPY ./frontend .

# Build the application for production
RUN npm run build

# Production stage
FROM node:16-alpine

WORKDIR /app

# Install serve globally to serve static files
RUN npm install -g serve

# Copy built files from builder stage
COPY --from=builder /app/build ./build

# Set timezone
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Europe/Istanbul /etc/localtime && \
    echo "Europe/Istanbul" > /etc/timezone

# Expose port
EXPOSE 3000

# Serve the built application
CMD ["serve", "-s", "build", "-l", "3000"]
