import { App, PluginSettingTab, Setting } from "obsidian";
import EasyUniqueNotePlugin from "../main";

export class EasyUniqueNotePluginSettingsTab extends PluginSettingTab {
	plugin: EasyUniqueNotePlugin;
	constructor(app: App, plugin: EasyUniqueNotePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Setting for base directory
		new Setting(containerEl)
			.setName("Base directory")
			.setDesc("Enter the directory to be treated as the base directory.")
			.addText((text) => {
				text.setPlaceholder("e.g. pages\n")
					.setValue(this.plugin.settings.baseDir)
					.onChange(async (value) => {
						this.plugin.settings.baseDir = value;
						await this.plugin.saveData(this.plugin.settings);
					});
			});

		// Setting for daily note directory
		new Setting(containerEl)
			.setName("Daily note directory")
			.setDesc("Enter the directory where daily notes are stored.")
			.addText((text) => {
				text.setPlaceholder("e.g. journals\n")
					.setValue(this.plugin.settings.dailyNoteDir)
					.onChange(async (value) => {
						this.plugin.settings.dailyNoteDir = value;
						await this.plugin.saveData(this.plugin.settings);
					});
			});
	}
}
