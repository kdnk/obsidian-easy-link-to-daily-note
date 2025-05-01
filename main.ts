import { App, parseYaml, getFrontMatterInfo, Notice, Plugin, PluginManifest, TFile } from "obsidian";
import { EasyLinkToDailyNotePluginSettingsTab } from "./settings/settings";
import { DEFAULT_SETTINGS, EasyLinkToDailyNoteSettings } from "./settings/settings-info";

export default class EasyLinkToDailyNotePlugin extends Plugin {
	settings: EasyLinkToDailyNoteSettings;

	constructor(app: App, pluginManifest: PluginManifest) {
		super(app, pluginManifest);
	}

	async addUniqueNote() {
		const { todayFile, todayPath } = this.getTodayFileAndPath();
		const baseDir = this.settings.baseDir;
		const uniqueNotePath = `${baseDir}/${window.moment().format("YYYY-MM-DD-HH-mm-ss")}.md`;
		const currentTime = window.moment().format("HH:mm");

		const uniqueFile = await this.app.vault.create(`${uniqueNotePath}`, `- [[${this.getCanonicalFileName(todayPath)}]] ${currentTime}`);
		await this.app.vault.append(todayFile, `- ${currentTime} [[${this.getCanonicalFileName(uniqueNotePath)}]] `);

		const leaf = this.app.workspace.getLeaf(false);
		// https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceLeaf/openFile
		// https://liamca.in/Obsidian/API+FAQ/views/focus+the+note+title+with+the+cursor
		await leaf.openFile(uniqueFile, { eState: { rename: "end" } });
	}

	private getTodayFileAndPath() {
		const journalDir = this.settings.dailyNoteDir;
		if (!journalDir) {
			new Notice("Please set the daily note directory in the plugin settings.");
			throw new Error("Please set the daily note directory in the plugin settings.");
		}
		const todayPath = `${journalDir}/${window.moment().format("YYYY-MM-DD")}.md`;
		const todayFile = this.app.vault.getFileByPath(todayPath);

		if (!todayFile) {
			new Notice(`Today's daily note (${todayPath}) cannot be found.`);
			throw new Error(`Today's daily note (${todayPath}) cannot be found.`);
		}

		return {
			todayFile,
			todayPath,
		};
	}

	private getCanonicalFileName(path: string) {
		let fileName = path;
		if (path.endsWith(".md")) {
			fileName = fileName.slice(0, -3);
		}

		const baseDir = this.settings.baseDir;
		if (!baseDir) {
			new Notice("Please set the base directory in the plugin settings.");
			throw new Error("Please set the base directory in the plugin settings.");
		}

		if (path.startsWith(`${baseDir}/`)) {
			fileName = fileName.slice(baseDir.length + 1);
		}

		const journalDir = this.settings.dailyNoteDir;
		if (path.startsWith(`${journalDir}/`)) {
			fileName = fileName.slice(journalDir.length + 1);
		}

		return fileName;
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new EasyLinkToDailyNotePluginSettingsTab(this.app, this));

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "easy-link-to-daily-note-create",
			name: "Create a unique note",
			callback: async () => {
				await this.addUniqueNote();
			},
		});

		this.addRibbonIcon("create-new", "Create a unique note", async () => {
			await this.addUniqueNote();
		});

		this.app.workspace.onLayoutReady(() => {
			const processedFileMap = new Map<string, boolean>();
			this.registerEvent(
				this.app.vault.on("create", async (file: TFile) => {
					if (!this.settings.shouldAppendWebClipper) return;

					const append = async () => {
						if (!this.app.metadataCache.resolvedLinks[file.path]) {
							const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
							await sleep(50);
							await append();
							return;
						} else {
							processedFileMap.set(file.path, true);
							const unprocessedContent = await this.app.vault.read(file);
							const fileContent = unprocessedContent.normalize("NFC");
							const { frontmatter } = getFrontMatterInfo(fileContent);
							const tags = parseYaml(frontmatter)?.tags;

							if (!tags) return;
							if (!tags.includes("clippings")) return;
							const { todayFile } = this.getTodayFileAndPath();
							const currentTime = window.moment().format("HH:mm");
							this.app.vault.append(todayFile, `- ${currentTime} [[${this.getCanonicalFileName(file.path)}]] `);
							return;
						}
					};
					await append();
				}),
			);
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
