import { app } from '#lib/server/app.ts';
import { body, text, vaultJson } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

/** Bikin tab baru. */
export const POST: RequestHandler = async ({ params, request }) => {
	const { title } = await body<{ title?: unknown }>(request);
	return vaultJson(async () => ({
		tab: await app().vault.createTab(params.doc, text(title, 'Judul'))
	}));
};

/** Ganti judul dokumen. */
export const PATCH: RequestHandler = async ({ params, request }) => {
	const { title } = await body<{ title?: unknown }>(request);
	return vaultJson(() => app().vault.renameDoc(params.doc, text(title, 'Judul')));
};

export const DELETE: RequestHandler = async ({ params }) =>
	vaultJson(() => app().vault.deleteDoc(params.doc));
