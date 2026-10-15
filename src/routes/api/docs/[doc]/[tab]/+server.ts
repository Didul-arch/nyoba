import { error } from '@sveltejs/kit';
import { app } from '#lib/server/app.ts';
import { body, vaultJson } from '#lib/server/http.ts';
import type { SaveRequest } from '#lib/types.ts';
import type { RequestHandler } from './$types';

/** Simpan isi tab. */
export const PUT: RequestHandler = async ({ params, request }) => {
	const req = await body<Partial<SaveRequest>>(request);
	if (
		typeof req.frontmatter !== 'string' ||
		typeof req.body !== 'string' ||
		typeof req.baseHash !== 'string' ||
		(req.title !== undefined && typeof req.title !== 'string')
	) {
		error(400, 'Format simpan nggak valid');
	}
	const { frontmatter, body: md, baseHash, title } = req;
	return vaultJson(() =>
		app().vault.saveTab(params.doc, params.tab, { frontmatter, body: md, baseHash, title })
	);
};

/** Pindah urutan tab. */
export const PATCH: RequestHandler = async ({ params, request }) => {
	const { index } = await body<{ index?: unknown }>(request);
	if (typeof index !== 'number' || !Number.isInteger(index)) error(400, 'index harus angka');
	return vaultJson(() => app().vault.moveTab(params.doc, params.tab, index));
};

export const DELETE: RequestHandler = async ({ params }) =>
	vaultJson(() => app().vault.deleteTab(params.doc, params.tab));
