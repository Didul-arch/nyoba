import { error, json } from '@sveltejs/kit';
import { VaultError } from './vault';

/** Jalanin operasi vault, ubah VaultError jadi respons HTTP yang rapi. */
export async function vaultJson<T>(fn: () => Promise<T>): Promise<Response> {
	try {
		return json((await fn()) ?? { ok: true });
	} catch (err) {
		if (err instanceof VaultError) error(err.status, err.message);
		throw err;
	}
}

export async function body<T>(request: Request): Promise<T> {
	try {
		return (await request.json()) as T;
	} catch {
		error(400, 'Body harus JSON');
	}
}

export function text(value: unknown, field: string): string {
	if (typeof value !== 'string' || !value.trim()) error(400, `${field} wajib diisi`);
	return value.trim().slice(0, 200);
}
