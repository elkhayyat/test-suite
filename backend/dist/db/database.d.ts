import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
export declare function getDatabase(): Promise<Database<sqlite3.Database, sqlite3.Statement>>;
export declare function closeDatabase(): Promise<void>;
//# sourceMappingURL=database.d.ts.map