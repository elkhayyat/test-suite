import { Db, Collection } from 'mongodb';
import { User, UserWithPassword } from '../../../shared/src/types';
import { v4 as uuidv4 } from 'uuid';

export class UserStoreMongo {
  private db: Db;
  private users: Collection<UserWithPassword>;

  constructor(db: Db) {
    this.db = db;
    this.users = db.collection<UserWithPassword>('users');
  }

  async createUser(userData: Omit<UserWithPassword, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user: UserWithPassword = {
      ...userData,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.users.insertOne(user);
    // Return user without password
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserById(id: string): Promise<User | null> {
    const user = await this.users.findOne({ id });
    if (!user) return null;
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await this.users.findOne({ email });
    if (!user) return null;
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserWithPasswordByEmail(email: string): Promise<UserWithPassword | null> {
    return this.users.findOne({ email });
  }

  async updateUser(id: string, updates: Partial<UserWithPassword>): Promise<User | null> {
    const result = await this.users.findOneAndUpdate(
      { id },
      { 
        $set: {
          ...updates,
          updatedAt: new Date(),
        }
      },
      { returnDocument: 'after' }
    );

    if (!result) return null;
    const { passwordHash, ...userWithoutPassword } = result;
    return userWithoutPassword;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.users.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    const users = await this.users.find({ organizationId }).toArray();
    return users.map(({ passwordHash, ...user }) => user);
  }

  async updateUserOrganization(userId: string, organizationId: string): Promise<User | null> {
    return this.updateUser(userId, { organizationId });
  }
}