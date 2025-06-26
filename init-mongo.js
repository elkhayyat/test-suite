// Create database and user
db = db.getSiblingDB('test-flow-suite');

// Create a user for the application
db.createUser({
  user: 'app_user',
  pwd: 'app_password',
  roles: [
    {
      role: 'readWrite',
      db: 'test-flow-suite'
    }
  ]
});

// Create collections with validation
db.createCollection('flows', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['id', 'name', 'projectId', 'steps', 'connections'],
      properties: {
        id: { bsonType: 'string' },
        name: { bsonType: 'string' },
        projectId: { bsonType: 'string' },
        folderId: { bsonType: ['string', 'null'] },
        description: { bsonType: ['string', 'null'] },
        steps: { bsonType: 'array' },
        connections: { bsonType: 'array' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('environments', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['id', 'name', 'isDefault'],
      properties: {
        id: { bsonType: 'string' },
        name: { bsonType: 'string' },
        description: { bsonType: ['string', 'null'] },
        isDefault: { bsonType: 'bool' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('environmentVariables', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['id', 'environmentId', 'key', 'value', 'isSecret'],
      properties: {
        id: { bsonType: 'string' },
        environmentId: { bsonType: 'string' },
        key: { bsonType: 'string' },
        value: { bsonType: 'string' },
        isSecret: { bsonType: 'bool' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('projects', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['id', 'name'],
      properties: {
        id: { bsonType: 'string' },
        name: { bsonType: 'string' },
        description: { bsonType: ['string', 'null'] },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('folders', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['id', 'name', 'projectId'],
      properties: {
        id: { bsonType: 'string' },
        name: { bsonType: 'string' },
        projectId: { bsonType: 'string' },
        parentId: { bsonType: ['string', 'null'] },
        description: { bsonType: ['string', 'null'] },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['id', 'email', 'name'],
      properties: {
        id: { bsonType: 'string' },
        email: { bsonType: 'string' },
        name: { bsonType: 'string' },
        role: { bsonType: 'string', enum: ['admin', 'user'] },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('projectUsers', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['projectId', 'userId', 'role'],
      properties: {
        projectId: { bsonType: 'string' },
        userId: { bsonType: 'string' },
        role: { bsonType: 'string', enum: ['admin', 'member', 'viewer'] },
        createdAt: { bsonType: 'date' }
      }
    }
  }
});

print('Database initialization completed');