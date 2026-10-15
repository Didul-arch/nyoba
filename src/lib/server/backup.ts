import { existsSync } from 'node:fs';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { Db } from './db/index.ts';

const NAME = /^app-\d{4}-\d{2}-\d{2}\.db$/;
const KEEP_DAYS = 14;
const CHECK_MS = 60 * 60 * 1000;

/** `app-2026-10-15.db` (tanggal UTC). */
export const backupName = (date: Date) => `app-${date.toISOString().slice(0, 10)}.db`;

/** Backup yang kelewat jatah simpan, paling lama dulu dibuang. */
export function toPrune(files: string[], keep = KEEP_DAYS): string[] {
	return files
		.filter((f) => NAME.test(f))
		.sort()
		.reverse()
		.slice(keep);
}

/**
 * Salinan harian `app.db`. Posisi sitasi cuma ada di DB (nggak ikut Git),
 * jadi ini satu-satunya jaring pengaman buat data itu.
 */
export function createBackup(db: Db, dir: string, now: () => Date = () => new Date()) {
	async function runOnce(): Promise<void> {
		await mkdir(dir, { recursive: true });
		const path = join(dir, backupName(now()));
		if (!existsSync(path)) await db.backup(path);
		for (const old of toPrune(await readdir(dir))) {
			for (const suffix of ['', '-wal', '-shm']) await rm(join(dir, old + suffix), { force: true });
		}
	}

	function start(): void {
		const run = () => runOnce().catch((err) => console.error('[nyoba] backup gagal:', err));
		void run();
		setInterval(run, CHECK_MS).unref();
	}

	return { runOnce, start };
}
