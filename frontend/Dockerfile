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
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/

# Copy built files from builder stage
COPY --from=builder /app/build .

# Set timezone
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Europe/Istanbul /etc/localtime && \
    echo "Europe/Istanbul" > /etc/timezone

# Expose port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
