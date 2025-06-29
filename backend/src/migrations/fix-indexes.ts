import { MongoClient } from 'mongodb';

async function fixIndexes() {
  const mongoUrl = process.env.MONGODB_URL || 'mongodb://app_user:app_password@localhost:27017/test-flow-suite';
  const dbName = process.env.MONGODB_DB_NAME || 'test-flow-suite';
  
  const client = new MongoClient(mongoUrl);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    const db = client.db(dbName);
    
    console.log('Fixing environment indexes...');
    const environments = db.collection('environments');
    
    // Drop the old unique index on name
    try {
      await environments.dropIndex('name_1');
      console.log('Dropped old name index on environments');
    } catch (error) {
      console.log('Old name index not found or already dropped');
    }
    
    // Create new compound unique index
    await environments.createIndex({ name: 1, organizationId: 1 }, { unique: true });
    console.log('Created compound index on environments (name, organizationId)');
    
    console.log('Fixing project indexes...');
    const projects = db.collection('projects');
    
    // Drop the old unique index on name
    try {
      await projects.dropIndex('name_1');
      console.log('Dropped old name index on projects');
    } catch (error) {
      console.log('Old name index not found or already dropped');
    }
    
    // Create new compound unique index
    await projects.createIndex({ name: 1, organizationId: 1 }, { unique: true });
    console.log('Created compound index on projects (name, organizationId)');
    
    console.log('Index migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the migration
fixIndexes();