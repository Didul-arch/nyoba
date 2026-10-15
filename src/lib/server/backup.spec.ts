import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { backupName, createBackup, toPrune } from './backup';
import { openDb } from './db';

describe('backup', () => {
	it('nama file pakai tanggal', () => {
		expect(backupName(new Date('2026-10-15T23:00:00Z'))).toBe('app-2026-10-15.db');
	});

	it('simpan 14 terbaru, abaikan file lain', () => {
		const files = Array.from(
			{ length: 16 },
			(_, i) => `app-2026-10-${String(i + 1).padStart(2, '0')}.db`
		);
		expect(toPrune([...files, 'catatan.txt'])).toEqual(['app-2026-10-02.db', 'app-2026-10-01.db']);
		expect(toPrune(files.slice(0, 3))).toEqual([]);
	});

	it('bikin salinan yang bisa dibuka, sekali per hari, dan buang yang lama', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'nyoba-bak-'));
		const db = openDb(join(dir, 'app.db'));
		db.prepare(
			"INSERT INTO sessions (id_hash, created_at, expires_at) VALUES ('x', 'a', 'b')"
		).run();
		const backups = join(dir, 'backups');
		let now = new Date('2026-10-15T10:00:00Z');
		const backup = createBackup(db, backups, () => now);

		await backup.runOnce();
		await backup.runOnce();
		expect(readdirSync(backups)).toEqual(['app-2026-10-15.db']);
		const copy = new Database(join(backups, 'app-2026-10-15.db'), { readonly: true });
		expect(copy.prepare('SELECT COUNT(*) AS n FROM sessions').get()).toEqual({ n: 1 });
		copy.close();

		for (let d = 1; d <= 14; d++)
			writeFileSync(join(backups, `app-2026-09-${String(d).padStart(2, '0')}.db`), '');
		now = new Date('2026-10-16T10:00:00Z');
		await backup.runOnce();
		const left = readdirSync(backups)
			.filter((f) => f.endsWith('.db'))
			.sort();
		expect(left).toHaveLength(14);
		expect(left.at(-1)).toBe('app-2026-10-16.db');
		expect(left[0]).toBe('app-2026-09-03.db');
	});
});
