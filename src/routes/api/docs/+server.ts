import { app } from '#lib/server/app.ts';
import { body, text, vaultJson } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

/** Bikin dokumen baru (sekalian tab pertamanya). */
export const POST: RequestHandler = async ({ request }) => {
	const { title } = await body<{ title?: unknown }>(request);
	return vaultJson(() => app().vault.createDoc(text(title, 'Judul')));
};
