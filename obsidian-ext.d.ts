import "obsidian";

declare module "obsidian" {
	interface App {
		internalPlugins: {
			getEnabledPluginById(id: string): any;
		};
	}

	interface Vault {
		getConfig(id: string): string;
	}
}
