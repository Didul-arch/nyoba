import { error } from '@sveltejs/kit';
import { app } from '#lib/server/app.ts';
import { VaultError } from '#lib/server/vault.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { docs } = await parent();
	const doc = docs.find((d) => d.slug === params.doc);
	if (!doc) error(404, 'Dokumen nggak ketemu');
	try {
		return { doc, content: await app().vault.readTab(params.doc, params.tab) };
	} catch (err) {
		if (err instanceof VaultError)
			error(err.status, err.status === 404 ? 'Tab nggak ketemu' : err.message);
		throw err;
	}
};
