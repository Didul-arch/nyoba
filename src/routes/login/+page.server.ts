import { fail, redirect } from '@sveltejs/kit';
import { app } from '#lib/server/app.ts';
import { SESSION_COOKIE } from '#lib/server/auth.ts';
import { safeNext } from '#lib/server/guard.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress, url }) => {
		const form = await request.formData();
		const username = String(form.get('username') ?? '');
		const password = String(form.get('password') ?? '');

		const result = await app().auth.login(
			username,
			password,
			getClientAddress(),
			request.headers.get('user-agent')
		);
		if (!result.ok) {
			return result.reason === 'dibatasi'
				? fail(429, { username, message: 'Kebanyakan salah. Tunggu 15 menit ya ☕' })
				: fail(400, { username, message: 'Username atau password salah' });
		}

		cookies.set(SESSION_COOKIE, result.token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			expires: result.expires
		});
		redirect(303, safeNext(url.searchParams.get('next')));
	}
};
