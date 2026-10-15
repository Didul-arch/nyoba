import { describe, expect, it } from 'vitest';
import { guard, safeNext } from './guard';

describe('guard', () => {
	it('tanpa login: halaman dilempar ke /login, API dapat 401', () => {
		expect(guard('/', false)).toBe('login');
		expect(guard('/d/skripsi/01-bab-1', false)).toBe('login');
		expect(guard('/logout', false)).toBe('login');
		expect(guard('/api/docs', false)).toBe('unauthorized');
		expect(guard('/api/docs/a/b', false)).toBe('unauthorized');
	});

	it('halaman login kebuka tanpa login, tapi yang udah login dilempar ke awal', () => {
		expect(guard('/login', false)).toBe('allow');
		expect(guard('/login', true)).toBe('home');
	});

	it('udah login: semua boleh', () => {
		expect(guard('/', true)).toBe('allow');
		expect(guard('/api/docs', true)).toBe('allow');
	});

	it('path mirip /login atau /api nggak lolos', () => {
		expect(guard('/loginx', false)).toBe('login');
		expect(guard('/apix', false)).toBe('login');
	});
});

describe('safeNext', () => {
	it('cuma terima path internal', () => {
		expect(safeNext('/d/a/b?x=1')).toBe('/d/a/b?x=1');
		expect(safeNext('//evil.com')).toBe('/');
		expect(safeNext('/\\evil.com')).toBe('/');
		expect(safeNext('https://evil.com')).toBe('/');
		expect(safeNext(null)).toBe('/');
	});
});
