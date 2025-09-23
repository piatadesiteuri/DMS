# Railway Dockerfile - Backend only
FROM node:18-alpine

WORKDIR /app

# Copy backend package files
COPY back-end/package*.json ./

# Install backend dependencies
RUN npm install

# Copy backend source code
COPY back-end/ ./

# Create uploads directory
RUN mkdir -p uploads

# Copy database dump
COPY pspd_database_dump.sql ./

# Expose port
EXPOSE 3001

# Start backend
CMD ["npm", "start"]
