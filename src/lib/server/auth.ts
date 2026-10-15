import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { verify } from '@node-rs/argon2';
import type { Db } from './db';

export const SESSION_COOKIE = 'nyoba_session';
export const SESSION_DAYS = 30;
const MAX_FAILS = 5;
const FAIL_WINDOW_MS = 15 * 60 * 1000;

interface AuthConfig {
	user: string;
	passwordHash: string;
	sessionSecret: string;
}

export type LoginResult =
	{ ok: true; token: string; expires: Date } | { ok: false; reason: 'salah' | 'dibatasi' };

const digest = (s: string) => createHash('sha256').update(s).digest();

export function createAuth(db: Db, cfg: AuthConfig, now: () => Date = () => new Date()) {
	const hashToken = (token: string) =>
		createHmac('sha256', cfg.sessionSecret).update(token).digest('hex');

	function failsSince(ip: string, since: Date): number {
		const row = db
			.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND ok = 0 AND at > ?')
			.get(ip, since.toISOString()) as { n: number };
		return row.n;
	}

	async function login(
		username: string,
		password: string,
		ip: string,
		userAgent: string | null
	): Promise<LoginResult> {
		const t = now();
		db.prepare('DELETE FROM login_attempts WHERE at < ?').run(
			new Date(t.getTime() - 24 * 3600 * 1000).toISOString()
		);
		if (failsSince(ip, new Date(t.getTime() - FAIL_WINDOW_MS)) >= MAX_FAILS) {
			return { ok: false, reason: 'dibatasi' };
		}

		// Password selalu dicek walau username salah, biar waktunya nggak bocorin apa-apa.
		const userOk = timingSafeEqual(digest(username), digest(cfg.user));
		const passOk = await verify(cfg.passwordHash, password).catch(() => false);
		const ok = userOk && passOk;
		db.prepare('INSERT INTO login_attempts (ip, ok, at) VALUES (?, ?, ?)').run(
			ip,
			ok ? 1 : 0,
			t.toISOString()
		);
		if (!ok) return { ok: false, reason: 'salah' };

		const token = randomBytes(32).toString('base64url');
		const expires = new Date(t.getTime() + SESSION_DAYS * 24 * 3600 * 1000);
		db.prepare(
			'INSERT INTO sessions (id_hash, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?)'
		).run(hashToken(token), t.toISOString(), expires.toISOString(), userAgent);
		return { ok: true, token, expires };
	}

	function validate(token: string): boolean {
		const row = db
			.prepare('SELECT 1 FROM sessions WHERE id_hash = ? AND expires_at > ?')
			.get(hashToken(token), now().toISOString());
		return row !== undefined;
	}

	function logout(token: string): void {
		db.prepare('DELETE FROM sessions WHERE id_hash = ? OR expires_at <= ?').run(
			hashToken(token),
			now().toISOString()
		);
	}

	return { login, validate, logout };
}
