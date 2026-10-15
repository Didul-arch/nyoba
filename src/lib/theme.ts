type Theme = 'light' | 'dark';

export function currentTheme(): Theme {
	const set = document.documentElement.dataset.theme;
	if (set === 'light' || set === 'dark') return set;
	return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function toggleTheme(): Theme {
	const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
	document.documentElement.dataset.theme = next;
	try {
		localStorage.setItem('nyoba-theme', next);
	} catch {
		// localStorage bisa diblok (mode privat); tema tetap ganti buat sesi ini.
	}
	return next;
}
