# Railway Dockerfile - Full-stack app
FROM node:18-alpine

WORKDIR /app

# Copy backend package files first
COPY back-end/package*.json ./

# Install backend dependencies
RUN npm install

# Copy frontend source code
COPY front-end/ ./front-end/

# Install frontend dependencies and build
WORKDIR /app/front-end
COPY front-end/package*.json ./
RUN npm install
RUN npm run build

# Go back to main directory
WORKDIR /app

# Copy backend source code
COPY back-end/ ./

# Create uploads directory
RUN mkdir -p uploads

# Copy database dump
COPY pspd_database_dump.sql ./

# Expose port
EXPOSE 3000

# Start backend (which serves frontend)
CMD ["npm", "start"]
