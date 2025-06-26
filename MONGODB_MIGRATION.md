# MongoDB Migration Guide

This guide explains how to run the Test Flow Suite with MongoDB instead of SQLite.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed
- MongoDB client tools (optional, for debugging)

## Setup

### 1. Start MongoDB with Docker Compose

```bash
# Start MongoDB and Mongo Express
docker-compose up -d

# Check if services are running
docker-compose ps
```

This will start:
- MongoDB on port 27017
- Mongo Express (web UI) on port 8081

### 2. Access Mongo Express

Open http://localhost:8081 in your browser:
- Username: `admin`
- Password: `admin123`

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Update `.env` with your configuration:
```env
MONGODB_URL=mongodb://localhost:27017/test-flow-suite
MONGODB_DB_NAME=test-flow-suite
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### 4. Run the Backend with MongoDB

```bash
# Development mode
npm run dev:mongo

# Production mode
npm run build
npm run start:mongo
```

## MongoDB Connection Options

### Local Development (No Auth)
```
MONGODB_URL=mongodb://localhost:27017/test-flow-suite
```

### With Authentication
```
MONGODB_URL=mongodb://app_user:app_password@localhost:27017/test-flow-suite
```

### MongoDB Atlas (Cloud)
```
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/test-flow-suite
```

## Data Migration from SQLite

If you have existing data in SQLite, you can migrate it to MongoDB:

1. Export data from SQLite (create a migration script)
2. Transform the data format if needed
3. Import into MongoDB

## Differences from SQLite Version

1. **Async Operations**: All database operations are now asynchronous
2. **IDs**: MongoDB uses ObjectIds internally, but we maintain string IDs for compatibility
3. **Queries**: More powerful query capabilities with MongoDB
4. **Scalability**: Better performance with large datasets
5. **Replication**: Built-in support for replication and sharding

## Troubleshooting

### Connection Issues
- Ensure MongoDB is running: `docker-compose ps`
- Check logs: `docker-compose logs mongodb`
- Verify connection string in `.env`

### Permission Issues
- Check MongoDB user permissions
- Ensure database exists
- Verify collection permissions

## Stopping Services

```bash
# Stop services
docker-compose stop

# Remove services and volumes
docker-compose down -v
```