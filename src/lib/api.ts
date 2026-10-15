import { resolve } from '$app/paths';

/** fetch JSON ke API sendiri; error dari server dilempar sebagai Error dengan pesannya. */
export async function api<T = unknown>(
	method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
	url: string,
	body?: unknown,
	init: RequestInit = {}
): Promise<T> {
	const res = await fetch(url, {
		method,
		headers: body === undefined ? undefined : { 'content-type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
		...init
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw Object.assign(new Error(data?.message ?? `Gagal (${res.status})`), {
			status: res.status
		});
	}
	return data as T;
}

export const docUrl = (doc: string, tab?: string) =>
	tab ? resolve('/(app)/d/[doc]/[tab]', { doc, tab }) : resolve('/(app)/d/[doc]', { doc });

export const apiUrl = (doc: string, tab?: string) =>
	tab ? resolve('/api/docs/[doc]/[tab]', { doc, tab }) : resolve('/api/docs/[doc]', { doc });
