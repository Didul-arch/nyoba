// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Locals {
			authenticated: boolean;
		}
		interface PageState {
			/** Tab baru dibikin: fokus ke judulnya. */
			baru?: boolean;
		}
	}
}

export {};
