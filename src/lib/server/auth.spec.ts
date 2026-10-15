import { hash } from '@node-rs/argon2';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createAuth } from './auth';
import { openDb, type Db } from './db';

const cfg = { user: 'deedol', passwordHash: '', sessionSecret: 'x'.repeat(32) };

describe('auth', () => {
	let db: Db;
	let now: Date;
	let auth: ReturnType<typeof createAuth>;

	beforeAll(async () => {
		cfg.passwordHash = await hash('rahasia-banget');
	});

	beforeEach(() => {
		db = openDb(':memory:');
		now = new Date('2026-10-15T10:00:00Z');
		auth = createAuth(db, cfg, () => now);
	});

	it('login pakai kredensial env berhasil dan sesinya valid', async () => {
		const res = await auth.login('deedol', 'rahasia-banget', '1.1.1.1', 'tes');
		expect(res.ok).toBe(true);
		if (!res.ok) return;
		expect(auth.validate(res.token)).toBe(true);
		expect(auth.validate(res.token + 'x')).toBe(false);
	});

	it('token aslinya nggak disimpan di DB', async () => {
		const res = await auth.login('deedol', 'rahasia-banget', '1.1.1.1', null);
		if (!res.ok) throw new Error('harusnya berhasil');
		const rows = db.prepare('SELECT id_hash FROM sessions').all() as { id_hash: string }[];
		expect(rows).toHaveLength(1);
		expect(rows[0].id_hash).not.toBe(res.token);
	});

	it('username atau password salah ditolak', async () => {
		expect(await auth.login('deedol', 'salah', '1.1.1.1', null)).toEqual({
			ok: false,
			reason: 'salah'
		});
		expect(await auth.login('orang', 'rahasia-banget', '1.1.1.1', null)).toEqual({
			ok: false,
			reason: 'salah'
		});
	});

	it('5x salah dalam 15 menit: dibatasi, walau password benar', async () => {
		for (let i = 0; i < 5; i++) await auth.login('deedol', 'salah', '2.2.2.2', null);
		expect(await auth.login('deedol', 'rahasia-banget', '2.2.2.2', null)).toEqual({
			ok: false,
			reason: 'dibatasi'
		});
		expect((await auth.login('deedol', 'rahasia-banget', '3.3.3.3', null)).ok).toBe(true);

		now = new Date(now.getTime() + 16 * 60 * 1000);
		expect((await auth.login('deedol', 'rahasia-banget', '2.2.2.2', null)).ok).toBe(true);
	});

	it('sesi kedaluwarsa setelah 30 hari, dan logout ngehapus sesi', async () => {
		const a = await auth.login('deedol', 'rahasia-banget', '1.1.1.1', null);
		const b = await auth.login('deedol', 'rahasia-banget', '1.1.1.1', null);
		if (!a.ok || !b.ok) throw new Error('harusnya berhasil');

		auth.logout(a.token);
		expect(auth.validate(a.token)).toBe(false);
		expect(auth.validate(b.token)).toBe(true);

		now = new Date(now.getTime() + 31 * 24 * 3600 * 1000);
		expect(auth.validate(b.token)).toBe(false);
	});
});
