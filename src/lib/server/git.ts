import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { SyncStatus } from '#lib/types.ts';

const exec = promisify(execFile);
const IDLE_MS = 60_000;
const SOON_MS = 3_000;

/** Baris pertama stderr git, biar pesan error di UI pendek & kebaca. */
function reason(err: unknown): string {
	const stderr = (err as { stderr?: string }).stderr?.trim();
	const line = (stderr || (err as Error).message || String(err)).split('\n')[0];
	return line.replace(/^(fatal|error): /, '');
}

/**
 * Commit otomatis vault. Simpan ke disk tiap ketik, tapi commit cuma
 * setelah idle 60 dtk (atau ~3 dtk setelah pindah tab) biar riwayat kebaca.
 * Kalau `remote` diisi: tarik pas nyala, push tiap habis commit.
 */
export function createGit(root: string, remote?: string) {
	const pending = new Set<string>();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let queue: Promise<void> = Promise.resolve();
	let disabled = false;
	let sync: SyncStatus = remote
		? { remote: true, ok: true, message: 'Belum sinkron' }
		: { remote: false, ok: true, message: 'Cuma di laptop ini' };

	// --git-dir eksplisit: kalau .git vault hilang, git error, bukan naik
	// ke folder induk dan diam-diam commit ke repo lain.
	const gitDir = join(root, '.git');
	// Jangan pernah nunggu input password/passphrase: server bisa macet selamanya.
	const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_SSH_COMMAND: 'ssh -o BatchMode=yes' };
	const git = (...args: string[]) =>
		exec('git', [`--git-dir=${gitDir}`, `--work-tree=${root}`, ...args], { cwd: root, env });

	async function init(): Promise<void> {
		if (existsSync(gitDir)) return;
		await exec('git', ['init', '-q', '-b', 'main', root], { env });
		await git('config', 'user.name', 'nyoba');
		await git('config', 'user.email', 'nyoba@localhost');
	}

	async function connectRemote(url: string): Promise<void> {
		const { stdout } = await git('remote');
		const has = stdout.split('\n').includes('origin');
		await git('remote', has ? 'set-url' : 'add', 'origin', url);
	}

	/** Ambil commit dari GitHub, cuma kalau bisa fast-forward. Nggak pernah maksa/nimpa. */
	async function pull(): Promise<void> {
		await git('fetch', '-q', 'origin');
		const remoteMain = await git('rev-parse', '--verify', '--quiet', 'origin/main').catch(
			() => null
		);
		if (remoteMain) await git('merge', '-q', '--ff-only', 'origin/main');
	}

	async function push(): Promise<void> {
		try {
			await git('push', '-q', '-u', 'origin', 'main');
			sync = {
				remote: true,
				ok: true,
				message: 'Tersinkron ke GitHub',
				at: new Date().toISOString()
			};
		} catch (err) {
			sync = { remote: true, ok: false, message: `Gagal push: ${reason(err)}` };
			console.warn('[nyoba] push gagal:', reason(err));
		}
	}

	async function ensureRepo(): Promise<void> {
		try {
			await init();
		} catch (err) {
			disabled = true;
			sync = { remote: Boolean(remote), ok: false, message: 'Git nggak bisa dipakai' };
			console.warn('[nyoba] git nggak bisa dipakai, riwayat versi mati:', err);
			return;
		}
		if (!remote) return;
		try {
			await connectRemote(remote);
			await pull();
			sync = {
				remote: true,
				ok: true,
				message: 'Tersinkron ke GitHub',
				at: new Date().toISOString()
			};
		} catch (err) {
			sync = { remote: true, ok: false, message: `Gagal narik dari GitHub: ${reason(err)}` };
			console.warn('[nyoba] pull gagal:', reason(err));
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
				await init();
				await git('add', '-A');
				const { stdout } = await git('status', '--porcelain');
				if (stdout.trim()) await git('commit', '-q', '-m', msg);
			} catch (err) {
				console.error('[nyoba] commit gagal:', err);
				return;
			}
			if (remote) await push();
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

	const status = (): SyncStatus => sync;

	return { ensureRepo, schedule, soon, flush, status };
}
