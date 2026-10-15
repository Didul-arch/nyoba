export type Verdict = 'allow' | 'login' | 'unauthorized' | 'home';

/** Mutusin nasib request berdasarkan path & status login. */
export function guard(pathname: string, authenticated: boolean): Verdict {
	const isLogin = pathname === '/login' || pathname.startsWith('/login/');
	if (isLogin) return authenticated ? 'home' : 'allow';
	if (authenticated) return 'allow';
	return pathname === '/api' || pathname.startsWith('/api/') ? 'unauthorized' : 'login';
}

/** Cuma terima path internal, biar `?next=` nggak bisa dipakai lempar ke situs lain. */
export function safeNext(next: string | null): string {
	return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
		? next
		: '/';
}
