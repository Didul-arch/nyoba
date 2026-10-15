import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config';
import schema from './schema.sql?raw';

export type Db = Database.Database;

// Migrasi ke-N wajib diakhiri `PRAGMA user_version = N`.
const migrations = [schema];

export function openDb(file: string): Db {
	const db = new Database(file);
	db.pragma('foreign_keys = ON');
	const version = db.pragma('user_version', { simple: true }) as number;
	for (const sql of migrations.slice(version)) db.exec(sql);
	return db;
}

let db: Db | undefined;

export function getDb(): Db {
	if (!db) {
		const { dataPath } = config();
		mkdirSync(dataPath, { recursive: true });
		db = openDb(join(dataPath, 'app.db'));
	}
	return db;
}
