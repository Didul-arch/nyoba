import { error, redirect } from '@sveltejs/kit';
import { docUrl } from '#lib/api.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params }) => {
	const { docs } = await parent();
	const doc = docs.find((d) => d.slug === params.doc);
	if (!doc) error(404, 'Dokumen nggak ketemu');
	if (!doc.tabs.length) error(404, 'Dokumen ini belum punya tab');
	redirect(303, docUrl(doc.slug, doc.tabs[0].slug));
};
