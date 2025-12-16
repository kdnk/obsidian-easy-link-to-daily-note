import "obsidian";

declare module "obsidian" {
	interface Vault {
		getConfig(id: string): string | undefined;
	}
}
