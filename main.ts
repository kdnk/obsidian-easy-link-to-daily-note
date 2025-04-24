import { App, Notice, Plugin, PluginManifest } from "obsidian";
import { EasyUniqueNotePluginSettingsTab } from "./settings/settings";
import {
	DEFAULT_SETTINGS,
	EasyUniqueNoteSettings,
} from "./settings/settings-info";

// Remember to rename these classes and interfaces!

export default class EasyUniqueNotePlugin extends Plugin {
	settings: EasyUniqueNoteSettings;

	constructor(app: App, pluginManifest: PluginManifest) {
		super(app, pluginManifest);
	}

	async addUniqueNote() {
		const journalDir = this.settings.dailyNoteDir;
		const baseDir = this.settings.baseDir;

		if (!journalDir || !baseDir) {
			new Notice(
				"Please set the base directory and daily note directory in the plugin settings.",
			);
			return;
		}

		const uniqueNotePath = `${baseDir}/${window.moment().format("YYYY-MM-DD-HH-mm-ss")}.md`;
		const todayPath = `${journalDir}/${window.moment().format("YYYY-MM-DD")}.md`;
		const todayFile = this.app.vault.getFileByPath(todayPath);
		const currentTime = window.moment().format("HH:mm");

		if (todayFile) {
			const uniqueFile = await this.app.vault.create(
				`${uniqueNotePath}`,
				`- [[${this.getCanonicalFileName(todayPath)}]] ${currentTime}`,
			);
			this.app.vault.append(
				todayFile,
				`- ${currentTime} [[${this.getCanonicalFileName(uniqueNotePath)}]] `,
			);

			const leaf = this.app.workspace.getLeaf(false);
			// https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceLeaf/openFile
			// https://liamca.in/Obsidian/API+FAQ/views/focus+the+note+title+with+the+cursor
			await leaf.openFile(uniqueFile, { eState: { rename: "end" } });
		} else {
			new Notice(
				"Please create a journal for today first. The journal file should be in the format `YYYY-MM-DD.md`.",
			);
		}
	}

	private getCanonicalFileName(path: string) {
		let fileName = path;
		if (path.endsWith(".md")) {
			fileName = fileName.slice(0, -3);
		}

		const baseDir = this.settings.baseDir;
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
		this.addSettingTab(new EasyUniqueNotePluginSettingsTab(this.app, this));

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "easy-unique-note-create",
			name: "Create unique note",
			callback: async () => {
				await this.addUniqueNote();
			},
		});

		this.addRibbonIcon(
			"create-new",
			"Create a easy unique note",
			async () => {
				await this.addUniqueNote();
			},
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
