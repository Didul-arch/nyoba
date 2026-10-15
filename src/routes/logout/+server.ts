import { redirect } from '@sveltejs/kit';
import { app } from '#lib/server/app.ts';
import { SESSION_COOKIE } from '#lib/server/auth.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (token) app().auth.logout(token);
	cookies.delete(SESSION_COOKIE, { path: '/' });
	await app().git.flush();
	redirect(303, '/login');
};
