export interface TabInfo {
	slug: string;
	title: string;
}

export interface DocInfo {
	slug: string;
	title: string;
	tabs: TabInfo[];
}

/** Status sinkron vault ke GitHub, buat indikator di sidebar. */
export interface SyncStatus {
	remote: boolean;
	ok: boolean;
	message: string;
	at?: string;
}

export type Enums = Record<string, string[]>;

export interface TabContent {
	doc: string;
	tab: string;
	title: string;
	/** Isi YAML di antara `---`, tanpa garisnya. */
	frontmatter: string;
	body: string;
	enums: Enums;
	/** sha256 isi file, buat deteksi file diubah dari luar (Obsidian dll). */
	hash: string;
	/** true kalau editor nggak bisa nyimpen ulang file ini persis sama. */
	lossy: boolean;
}

export interface SaveRequest {
	frontmatter: string;
	body: string;
	baseHash: string;
	title?: string;
}

export interface SaveResponse {
	hash: string;
	frontmatter: string;
	title: string;
	enums: Enums;
}
