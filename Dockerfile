# ==============================================================================
# SkyPulse Weather Dashboard - Dockerfile
# Production-ready, secure, lightweight Node.js image
# ==============================================================================

FROM node:20-alpine

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    DOCKER=true

# Create and set working directory
WORKDIR /app

# Copy package metadata
COPY package.json ./

# Copy dashboard static files and server
COPY server.js index.html styles.css app.js ./

# Set correct permissions and switch to non-root user for security
RUN chown -R node:node /app
USER node

# Expose port for incoming HTTP traffic
EXPOSE 3000

# Docker healthcheck to ensure container is healthy and responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application
CMD ["node", "server.js"]
