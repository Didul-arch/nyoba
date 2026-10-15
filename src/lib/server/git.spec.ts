import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
});
