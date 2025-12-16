import { App, PluginSettingTab, Setting } from "obsidian";
import EasyLinkToDailyNotePlugin from "../main";

export class EasyLinkToDailyNotePluginSettingsTab extends PluginSettingTab {
	plugin: EasyLinkToDailyNotePlugin;
	constructor(app: App, plugin: EasyLinkToDailyNotePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Setting for web clipper
		new Setting(containerEl)
			.setName("Append web clipper's link to daily note")
			.setDesc("")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.shouldAppendWebClipper).onChange(async (value) => {
					this.plugin.settings.shouldAppendWebClipper = value;
					await this.plugin.saveData(this.plugin.settings);
				});
			});
	}
}
