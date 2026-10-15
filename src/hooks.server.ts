import { json, redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { app, initApp } from '#lib/server/app.ts';
import { SESSION_COOKIE } from '#lib/server/auth.ts';
import { guard } from '#lib/server/guard.ts';

export const init: ServerInit = initApp;

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.authenticated = token ? app().auth.validate(token) : false;

	const verdict = guard(event.url.pathname, event.locals.authenticated);
	if (verdict === 'unauthorized') return json({ message: 'Login dulu' }, { status: 401 });
	if (verdict === 'login') {
		redirect(303, `/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}
	if (verdict === 'home') redirect(303, '/');
	return resolve(event);
};
