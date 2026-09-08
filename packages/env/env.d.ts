interface ImportMetaEnv {
	readonly VITE_APP_URL: string;
	readonly VITE_SERVER_URL: string;
	readonly MODE?: string;
	readonly DEV?: boolean;
	readonly PROD?: boolean;
	readonly [key: string]: string | boolean | number | undefined;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
