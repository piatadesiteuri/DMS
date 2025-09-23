# Railway Dockerfile - Full-stack app
FROM node:18-alpine

WORKDIR /app

# Copy backend package files
COPY back-end/package*.json ./

# Install backend dependencies
RUN npm install

# Copy frontend source code
COPY front-end/ ./front-end/

# Install frontend dependencies
WORKDIR /app/front-end
RUN npm install

# Build frontend
RUN npm run build

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
