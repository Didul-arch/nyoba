import { app } from '#lib/server/app.ts';
import type { RequestHandler } from './$types';

/** Dipanggil pas pindah tab / nutup halaman: majuin commit yang lagi nunggu. */
export const POST: RequestHandler = async () => {
	app().git.soon();
	return new Response(null, { status: 204 });
};
