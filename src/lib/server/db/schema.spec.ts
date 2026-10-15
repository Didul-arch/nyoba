import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type Db } from './index';

const now = '2026-10-15T00:00:00Z';

describe('schema.sql', () => {
	let db: Db;

	beforeEach(() => {
		db = openDb(':memory:');
		db.prepare(
			"INSERT INTO refs (key, type, title, created_at, updated_at) VALUES ('lazuardi2024', 'jurnal', 'Judul', ?, ?)"
		).run(now, now);
	});

	it('migrasi jalan sekali dan naikkan user_version ke 1', () => {
		expect(db.pragma('user_version', { simple: true })).toBe(1);
	});

	it('tolak kunci referensi yang nggak sesuai aturan', () => {
		const insert = db.prepare(
			"INSERT INTO refs (key, type, title, created_at, updated_at) VALUES (?, 'jurnal', 'X', ?, ?)"
		);
		expect(() => insert.run('Lazuardi2024', now, now)).toThrow(/CHECK/);
		expect(() => insert.run('lazuardi', now, now)).toThrow(/CHECK/);
	});

	it('nggak bisa hapus referensi yang masih dikutip', () => {
		db.prepare(
			"INSERT INTO citations (id, ref_key, doc_path, anchor_text, created_at, updated_at) VALUES ('c1', 'lazuardi2024', 'docs/a.md', 'teks', ?, ?)"
		).run(now, now);
		expect(() => db.exec("DELETE FROM refs WHERE key = 'lazuardi2024'")).toThrow(/FOREIGN KEY/);
	});

	it('cari teks penuh tanpa peduli aksen', () => {
		db.prepare('INSERT INTO docs_fts (doc_path, title, body) VALUES (?, ?, ?)').run(
			'docs/a.md',
			'Bab 1',
			'Analisis keamanan café'
		);
		expect(db.prepare("SELECT doc_path FROM docs_fts WHERE docs_fts MATCH 'cafe'").all()).toEqual([
			{ doc_path: 'docs/a.md' }
		]);
	});
});
