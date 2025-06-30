# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from all workspaces
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY mcp-server/package.json ./mcp-server/

# Install dependencies
RUN npm ci

# Copy source files
COPY shared ./shared
COPY mcp-server ./mcp-server

# Build shared types first
WORKDIR /app/shared
RUN npm run build

# Build MCP server
WORKDIR /app/mcp-server
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY mcp-server/package.json ./mcp-server/

# Copy built files
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/mcp-server/dist ./mcp-server/dist

# Install production dependencies
RUN npm ci --omit=dev

WORKDIR /app/mcp-server

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start the server
CMD ["node", "dist/index-cloud.js"]