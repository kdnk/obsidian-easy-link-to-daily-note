import { Notice, Plugin } from "obsidian";

// Remember to rename these classes and interfaces!

export default class EasyUniqueNotePlugin extends Plugin {
	async addUniqueNote() {
		const uniqueNotePath = `pages/${window.moment().format("YYYY-MM-DD-HH-mm-ss")}.md`;
		const todayPath = `journals/${window.moment().format("YYYY-MM-DD")}.md`;
		const todayFile = this.app.vault.getFileByPath(todayPath);
		const currentTime = window.moment().format("HH:mm");

		if (todayFile) {
			const uniqueFile = await this.app.vault.create(
				`${uniqueNotePath}`,
				`- [[${this.getFileName(todayPath)}]] ${currentTime}`,
			);
			this.app.vault.append(
				todayFile,
				`- ${currentTime} [[${this.getFileName(uniqueNotePath)}]] `,
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

	private getFileName(path: string) {
		let fileName = path;
		if (path.endsWith(".md")) {
			fileName = fileName.slice(0, -3);
		}

		if (path.startsWith("pages/")) {
			fileName = fileName.slice(6);
		}

		if (path.startsWith("journals/")) {
			fileName = fileName.slice(9);
		}

		return fileName;
	}

	async onload() {
		// await this.loadSettings();

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "easy-unique-note-create",
			name: "Create unique note",
			callback: async () => {
				await this.addUniqueNote();
			},
		});
	}

	onunload() {}
}
