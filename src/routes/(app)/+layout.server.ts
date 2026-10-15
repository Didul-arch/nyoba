import { app } from '#lib/server/app.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ depends }) => {
	depends('nyoba:docs');
	return { docs: await app().vault.listDocs() };
};
