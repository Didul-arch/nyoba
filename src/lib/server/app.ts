import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createAuth } from './auth';
import { config } from './config';
import { getDb } from './db';
import { createGit } from './git';
import { createVault } from './vault';

function build() {
	const cfg = config();
	const git = createGit(cfg.vaultPath);
	return {
		git,
		vault: createVault(cfg.vaultPath, (label) => git.schedule(label)),
		auth: createAuth(getDb(), cfg)
	};
}

let ctx: ReturnType<typeof build> | undefined;

export function app() {
	ctx ??= build();
	return ctx;
}

/** Dipanggil sekali pas server nyala: cek env, siapin DB, vault, dan repo Git. */
export async function initApp(): Promise<void> {
	const { git } = app();
	await mkdir(join(config().vaultPath, 'docs'), { recursive: true });
	await git.ensureRepo();
	process.on('sveltekit:shutdown', () => void git.flush());
}
