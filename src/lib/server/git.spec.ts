import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createGit } from './git';

const log = (root: string) =>
	execFileSync('git', ['log', '--format=%s|%an'], { cwd: root, encoding: 'utf8' }).trim();

describe('git', () => {
	it('init repo dan gabung beberapa simpanan jadi satu commit', async () => {
		const root = mkdtempSync(join(tmpdir(), 'nyoba-git-'));
		const git = createGit(root);
		await git.ensureRepo();

		writeFileSync(join(root, 'a.md'), 'a');
		git.schedule('docs/kolokium/01-bab-1.md');
		writeFileSync(join(root, 'a.md'), 'ab');
		git.schedule('docs/kolokium/01-bab-1.md');
		writeFileSync(join(root, 'b.md'), 'b');
		git.schedule('docs/tracker/01-progress.md');
		await git.flush();

		expect(log(root)).toBe('kolokium/01-bab-1, tracker/01-progress|nyoba');
		await git.flush();
		expect(log(root).split('\n')).toHaveLength(1);
	});

	it('vault di dalam repo lain: .git hilang nggak bikin commit nyasar ke repo induk', async () => {
		const parent = mkdtempSync(join(tmpdir(), 'nyoba-induk-'));
		execFileSync('git', ['init', '-q', parent]);
		const root = join(parent, 'vault');
		mkdirSync(root);
		const git = createGit(root);
		await git.ensureRepo();
		rmSync(join(root, '.git'), { recursive: true });

		writeFileSync(join(root, 'a.md'), 'a');
		writeFileSync(join(parent, 'punya-induk.txt'), 'jangan disentuh');
		git.schedule('docs/a.md');
		await git.flush();

		expect(log(root)).toBe('a|nyoba');
		const parentStatus = execFileSync('git', ['status', '--porcelain'], {
			cwd: parent,
			encoding: 'utf8'
		});
		expect(parentStatus).toContain('?? punya-induk.txt');
		expect(() => execFileSync('git', ['log'], { cwd: parent, stdio: 'pipe' })).toThrow();
	});

	describe('sinkron ke remote (GitHub)', () => {
		const tmp = (name: string) => mkdtempSync(join(tmpdir(), `nyoba-${name}-`));

		it('laptop A push, laptop B yang masih kosong ikut dapet pas nyala', async () => {
			const remote = tmp('remote');
			execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remote]);

			const a = tmp('a');
			const gitA = createGit(a, remote);
			await gitA.ensureRepo();
			mkdirSync(join(a, 'docs'));
			writeFileSync(join(a, 'docs/bab-1.md'), '# Bab 1\n');
			gitA.schedule('docs/bab-1.md');
			await gitA.flush();
			expect(gitA.status()).toMatchObject({ remote: true, ok: true });
			expect(log(remote)).toBe('bab-1|nyoba');

			const b = tmp('b');
			const gitB = createGit(b, remote);
			await gitB.ensureRepo();
			expect(readFileSync(join(b, 'docs/bab-1.md'), 'utf8')).toBe('# Bab 1\n');
			expect(gitB.status().ok).toBe(true);

			writeFileSync(join(b, 'docs/bab-1.md'), '# Bab 1\n\nDari laptop B.\n');
			gitB.schedule('docs/bab-1.md');
			await gitB.flush();
			expect(log(remote).split('\n')).toHaveLength(2);
		});

		it('remote nggak bisa diakses: status ⚠, commit lokal tetap jalan, nggak macet', async () => {
			const root = tmp('lokal');
			const git = createGit(root, join(tmpdir(), 'nggak-ada-repo-ini'));
			await git.ensureRepo();
			expect(git.status()).toMatchObject({ remote: true, ok: false });
			expect(git.status().message).toMatch(/^Gagal narik dari GitHub/);

			writeFileSync(join(root, 'a.md'), 'a');
			git.schedule('docs/a.md');
			await git.flush();
			expect(log(root)).toBe('a|nyoba');
			expect(git.status().message).toMatch(/^Gagal push/);
		});

		it('tanpa remote: statusnya lokal aja', () => {
			expect(createGit(tmp('x')).status()).toEqual({
				remote: false,
				ok: true,
				message: 'Cuma di laptop ini'
			});
		});
	});
});
