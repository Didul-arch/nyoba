import { json } from '@sveltejs/kit';
import { app } from '#lib/server/app.ts';
import type { RequestHandler } from './$types';

/** Status sinkron vault ke GitHub (dipolling sidebar). */
export const GET: RequestHandler = () => json(app().git.status());
