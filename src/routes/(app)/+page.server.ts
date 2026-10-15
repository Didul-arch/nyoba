import { redirect } from '@sveltejs/kit';
import { docUrl } from '#lib/api.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { docs } = await parent();
	const first = docs.find((d) => d.tabs.length);
	if (first) redirect(303, docUrl(first.slug, first.tabs[0].slug));
};
