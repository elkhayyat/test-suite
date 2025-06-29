import { Db, Collection } from 'mongodb';
import { TestRun } from '../../../shared/src/types';

export class TestRunStoreMongo {
  private db: Db;
  private runs: Collection<TestRun>;

  constructor(db: Db) {
    this.db = db;
    this.runs = db.collection<TestRun>('runs');
  }

  async saveRun(run: TestRun): Promise<void> {
    await this.runs.replaceOne(
      { id: run.id },
      run,
      { upsert: true }
    );
  }

  async getRun(id: string): Promise<TestRun | null> {
    return this.runs.findOne({ id });
  }

  async getRunsByOrganization(organizationId: string, limit: number = 100): Promise<TestRun[]> {
    return this.runs
      .find({ organizationId })
      .sort({ startTime: -1 })
      .limit(limit)
      .toArray();
  }

  async getRunsByFlow(flowId: string, limit: number = 50): Promise<TestRun[]> {
    return this.runs
      .find({ flowId })
      .sort({ startTime: -1 })
      .limit(limit)
      .toArray();
  }

  async getRunsByUser(userId: string, limit: number = 100): Promise<TestRun[]> {
    return this.runs
      .find({ userId })
      .sort({ startTime: -1 })
      .limit(limit)
      .toArray();
  }

  async deleteOldRuns(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await this.runs.deleteMany({
      startTime: { $lt: cutoffDate }
    });
    
    return result.deletedCount;
  }
}