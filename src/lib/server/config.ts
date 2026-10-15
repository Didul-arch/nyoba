import { resolve } from 'node:path';

export interface Config {
	user: string;
	passwordHash: string;
	sessionSecret: string;
	vaultPath: string;
	dataPath: string;
}

let cached: Config | undefined;

function required(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Env ${name} belum diisi. Lihat .env.example`);
	return value;
}

/**
 * Env dibaca dari process.env (diisi `node --env-file`), bukan `$env` Vite:
 * Vite ngerusak hash argon2 karena `$...` di .env dianggap variabel.
 */
export function config(): Config {
	if (cached) return cached;

	const passwordHash = required('APP_PASSWORD_HASH');
	if (!passwordHash.startsWith('$argon2')) {
		throw new Error('APP_PASSWORD_HASH harus hash argon2. Bikin pakai `npm run hash-password`');
	}
	const sessionSecret = required('SESSION_SECRET');
	if (sessionSecret.length < 32) throw new Error('SESSION_SECRET minimal 32 karakter');

	cached = {
		user: required('APP_USER'),
		passwordHash,
		sessionSecret,
		vaultPath: resolve(process.env.VAULT_PATH || './vault'),
		dataPath: resolve(process.env.DATA_PATH || './.data')
	};
	return cached;
}
