import { App, parseFrontMatterTags, parseFrontMatterStringArray, parseYaml, getFrontMatterInfo, Notice, Plugin, PluginManifest, TFile } from "obsidian";
import { DailyNoteCentricPluginSettingsTab } from "./settings/settings";
import {
	DEFAULT_SETTINGS,
	DailyNoteCentricSettings,
} from "./settings/settings-info";

export default class DailyNoteCentricPlugin extends Plugin {
	settings: DailyNoteCentricSettings;

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

		const { todayFile, todayPath } = this.getTodayFileAndPath();

		const uniqueNotePath = `${baseDir}/${window.moment().format("YYYY-MM-DD-HH-mm-ss")}.md`;
		const currentTime = window.moment().format("HH:mm");

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
	}

	private getTodayFileAndPath() {
		const journalDir = this.settings.dailyNoteDir;
		if (!journalDir) {
			new Notice(
				"Please set the daily note directory in the plugin settings.",
			);
			throw new Error("Please set the daily note directory in the plugin settings.")
		}
		const todayPath = `${journalDir}/${window.moment().format("YYYY-MM-DD")}.md`;
		const todayFile = this.app.vault.getFileByPath(todayPath);

		if (!todayFile) {
			new Notice(
				`Today's file (${todayPath}) cannot be found.`,
			);
			throw new Error(`Today's file (${todayPath}) cannot be found.`)
		}

		return {
			todayFile,
			todayPath
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
		this.addSettingTab(new DailyNoteCentricPluginSettingsTab(this.app, this));

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "daily-note-centric-create",
			name: "Create a unique note",
			callback: async () => {
				await this.addUniqueNote();
			},
		});

		this.addRibbonIcon(
			"create-new",
			"Create a unique note",
			async () => {
				await this.addUniqueNote();
			},
		);

		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(
				this.app.vault.on('create', async (file: TFile) => {
					if (!this.settings.shouldAppendWebClipper) return;

					const unprocessedContent = await this.app.vault.read(file);
					const fileContent = unprocessedContent.normalize("NFC");
					const { frontmatter }  = getFrontMatterInfo(fileContent);
					const tags = parseYaml(frontmatter)?.tags

					if (!tags) return;
					if (!tags.includes("clippings")) return;

					const { todayFile } = this.getTodayFileAndPath();
					const currentTime = window.moment().format("HH:mm");
					this.app.vault.append(
						todayFile,
						`- ${currentTime} [[${this.getCanonicalFileName(file.path)}]] `,
					);
				})
			)
		})
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
