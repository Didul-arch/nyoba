import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const IDLE_MS = 60_000;
const SOON_MS = 3_000;

/**
 * Commit otomatis vault. Simpan ke disk tiap ketik, tapi commit cuma
 * setelah idle 60 dtk (atau ~3 dtk setelah pindah tab) biar riwayat kebaca.
 */
export function createGit(root: string) {
	const pending = new Set<string>();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let queue: Promise<void> = Promise.resolve();
	let disabled = false;

	const git = (...args: string[]) => exec('git', args, { cwd: root });

	async function ensureRepo(): Promise<void> {
		try {
			if (!existsSync(join(root, '.git'))) await git('init', '-q', '-b', 'main');
			await git('config', 'user.name', 'nyoba');
			await git('config', 'user.email', 'nyoba@localhost');
		} catch (err) {
			disabled = true;
			console.warn('[nyoba] git nggak bisa dipakai, riwayat versi mati:', err);
		}
	}

	function message(): string {
		const names = [...pending].map((p) => p.replace(/^docs\//, '').replace(/\.md$/, ''));
		const shown = names.slice(0, 3).join(', ');
		return names.length > 3 ? `${shown} +${names.length - 3} lagi` : shown;
	}

	function flush(): Promise<void> {
		clearTimeout(timer);
		timer = undefined;
		if (disabled || pending.size === 0) return queue;
		const msg = message();
		pending.clear();
		queue = queue.then(async () => {
			try {
				await git('add', '-A');
				const { stdout } = await git('status', '--porcelain');
				if (stdout.trim()) await git('commit', '-q', '-m', msg);
			} catch (err) {
				console.error('[nyoba] commit gagal:', err);
			}
		});
		return queue;
	}

	function schedule(label: string, delay = IDLE_MS): void {
		pending.add(label);
		clearTimeout(timer);
		timer = setTimeout(flush, delay);
	}

	/** Majuin commit yang lagi nunggu (dipanggil pas pindah tab / tutup halaman). */
	function soon(): void {
		if (pending.size) schedule([...pending][0], SOON_MS);
	}

	return { ensureRepo, schedule, soon, flush };
}
