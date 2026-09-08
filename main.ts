import { App, parseYaml, getFrontMatterInfo, Notice, Plugin, PluginManifest, TFile } from "obsidian";
import { runAfterSync } from "./run-after-sync";
import { EasyLinkToDailyNotePluginSettingsTab } from "./settings/settings";
import { DEFAULT_SETTINGS, EasyLinkToDailyNoteSettings } from "./settings/settings-info";

export default class EasyLinkToDailyNotePlugin extends Plugin {
	settings: EasyLinkToDailyNoteSettings;
	private active = true;
	private monitoringStartedAt = Infinity;
	private seenFiles = new WeakSet<TFile>();
	private pendingClippings = new Set<TFile>();

	constructor(app: App, pluginManifest: PluginManifest) {
		super(app, pluginManifest);
	}

	async addUniqueNote() {
		const { todayFile, todayPath } = this.getTodayFileAndPath();
		const baseDir = this.app.vault.getConfig("newFileFolderPath");

		const uniqueNotePath = `${baseDir}/${window.moment().format("YYYY-MM-DD-HH-mm-ss")}.md`;
		const currentTime = window.moment().format("HH:mm");

		await this.app.vault.append(todayFile, `\n- ${currentTime} [[${this.getCanonicalFileName(uniqueNotePath)}]]`);
		const uniqueFile = await this.app.vault.create(`${uniqueNotePath}`, `- [[${this.getCanonicalFileName(todayPath)}]] ${currentTime}`);

		// https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceLeaf/openFile
		// https://liamca.in/Obsidian/API+FAQ/views/focus+the+note+title+with+the+cursor
		const leaf = this.app.workspace.getLeaf(false);
		await leaf.openFile(uniqueFile, { eState: { rename: "end" } });
	}

	private async openFile(file: TFile) {
		const leaf = this.app.workspace.getLeaf(false);
		await leaf.openFile(file);
	}

	private canAppend(file: TFile): boolean {
		return this.active && this.settings.shouldAppendWebClipper
			&& this.app.vault.getAbstractFileByPath(file.path) === file
			&& Number.isFinite(file.stat.ctime)
			&& file.stat.ctime >= this.monitoringStartedAt;
	}

	private processPendingClippings(): void {
		for (const file of this.pendingClippings) {
			if (!this.canAppend(file)) {
				this.pendingClippings.delete(file);
				continue;
			}
			// Resolution events resume pending imports without polling or a time limit.
			if (!this.app.metadataCache.resolvedLinks[file.path]) continue;
			this.pendingClippings.delete(file);
			void this.appendClipping(file).catch(error => {
				console.error("Failed to append clipping to daily note", error);
				new Notice("Failed to append clipping to daily note. Check the console for details.");
			});
		}
	}

	private async appendClipping(file: TFile): Promise<void> {
		if (!this.canAppend(file)) return;
		const content = await this.app.vault.read(file);
		if (!this.canAppend(file)) return;
		const { frontmatter } = getFrontMatterInfo(content.normalize("NFC"));
		const tags = parseYaml(frontmatter)?.tags;
		if (!(Array.isArray(tags) || typeof tags === "string") || !tags.includes("clippings")) return;
		const { todayFile } = this.getTodayFileAndPath();
		const currentTime = window.moment().format("HH:mm");

		runAfterSync.call(this, async () => {
			if (!this.canAppend(file)) return;
			let appended = false;
			await this.app.vault.process(todayFile, todayContent => {
				if (!this.canAppend(file)) return todayContent;
				// A filename repair may have run during the metadata or Sync wait.
				const linkText = `[[${this.getCanonicalFileName(file.path)}]]`;
				if (todayContent.includes(linkText)) return todayContent;
				appended = true;
				return `${todayContent}\n- ${currentTime} ${linkText} `;
			});
			if (appended && this.active) await this.openFile(todayFile);
		});
	}

	private getTodayFileAndPath() {
		const journalDir = this.app.internalPlugins.getEnabledPluginById("daily-notes")?.options?.folder as string | undefined;

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

		const baseDir = this.app.vault.getConfig("newFileFolderPath");
		if (!baseDir) {
			new Notice("Please set the base directory in the plugin settings.");
			throw new Error("Please set the base directory in the plugin settings.");
		}

		if (path.startsWith(`${baseDir}/`)) {
			fileName = fileName.slice(baseDir.length + 1);
		}

		const journalDir = this.app.internalPlugins.getEnabledPluginById("daily-notes")?.options?.folder as string | undefined;
		if (!journalDir) {
			new Notice("Please set the daily note directory in the plugin settings.");
			throw new Error("Please set the daily note directory in the plugin settings.");
		}
		if (path.startsWith(`${journalDir}/`)) {
			fileName = fileName.slice(journalDir.length + 1);
		}

		return fileName;
	}

	async onload() {
		this.register(() => { this.active = false; this.pendingClippings.clear(); });
		await this.loadSettings();
		if (!this.active) return;
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
			if (!this.active) return;
			this.monitoringStartedAt = Date.now();
			for (const file of this.app.vault.getMarkdownFiles()) this.seenFiles.add(file);
			this.registerEvent(this.app.metadataCache.on("resolved", () => this.processPendingClippings()));
			this.registerEvent(this.app.vault.on("delete", file => {
				if (file instanceof TFile) this.pendingClippings.delete(file);
			}));
			this.registerEvent(
				this.app.vault.on("create", file => {
					if (!(file instanceof TFile) || file.extension !== "md" || this.seenFiles.has(file)) return;
					this.seenFiles.add(file);
					// Sync can emit create for old notes. ctime, unlike mtime or event time,
					// retains their original creation time through filename repairs.
					this.pendingClippings.add(file);
					this.processPendingClippings();
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
