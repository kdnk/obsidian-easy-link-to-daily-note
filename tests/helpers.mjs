import { build } from "esbuild";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

export class TFile {
	constructor(path, ctime = Date.now(), tags = "clippings") {
		this.path = path;
		this.name = path.split("/").pop();
		this.extension = this.name.split(".").pop();
		this.stat = { ctime, mtime: ctime, size: 0 };
		this.content = `---\n${JSON.stringify({ tags })}\n---\nArticle`;
	}
}
export class TFolder { constructor(path) { this.path = path; } }

const notices = [];
const obsidian = {
	TFile, TFolder,
	Plugin: class {
		constructor(app) { this.app = app; this.cleanups = []; this.commands = []; }
		async loadData() { return null; }
		register(fn) { this.cleanups.push(fn); }
		registerEvent(ref) { this.register(() => ref.off()); }
		addCommand(command) { this.commands.push(command); }
		addSettingTab() {}
		addRibbonIcon() {}
	},
	PluginSettingTab: class {},
	Notice: class { constructor(message) { notices.push(message); } },
	getFrontMatterInfo(content) { return { frontmatter: content.split("---\n")[1] }; },
	// JSON is valid YAML; use JSON frontmatter fixtures at this Obsidian API boundary.
	parseYaml: JSON.parse,
};

const { outputFiles } = await build({
	entryPoints: [fileURLToPath(new URL("../main.ts", import.meta.url))],
	bundle: true, platform: "node", format: "cjs", external: ["obsidian"], write: false,
});
const mod = { exports: {} };
new Function("module", "exports", "require", outputFiles[0].text)(mod, mod.exports,
	name => name === "obsidian" ? obsidian : createRequire(import.meta.url)(name));
const Plugin = mod.exports.default;

function events() {
	const listeners = new Map();
	return {
		on(name, fn) {
			if (!listeners.has(name)) listeners.set(name, new Set());
			listeners.get(name).add(fn);
			return { off: () => listeners.get(name).delete(fn) };
		},
		offref(ref) { ref.off(); },
		emit(name, ...args) { return [...(listeners.get(name) ?? [])].map(fn => fn(...args)); },
	};
}

export async function flush() { for (let i = 0; i < 50; i++) await Promise.resolve(); }

export function fixture(t) {
	t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: Date.parse("2026-09-08T13:42:00Z") });
	globalThis.window = {
		moment: () => ({ format: pattern => {
			const iso = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString();
			return pattern === "YYYY-MM-DD" ? iso.slice(0, 10) : iso.slice(11, 16);
		} }),
	};
	const files = new Map();
	const today = new TFile("journals/2026-09-08.md", Date.now() - 1000);
	today.content = "Existing daily note";
	files.set(today.path, today);
	const ready = [], opened = [], errors = [];
	const sync = { ...events(), syncStatus: "Fully synced" };
	const vaultEvents = events();
	const app = {
		workspace: { onLayoutReady: fn => ready.push(fn), getLeaf: () => ({ openFile: async f => opened.push(f.path) }) },
		internalPlugins: { plugins: { sync: { instance: sync } }, getEnabledPluginById: () => ({ options: { folder: "journals" } }) },
		metadataCache: { ...events(), resolvedLinks: {} },
		vault: {
			...vaultEvents,
			getConfig: () => "pages",
			getMarkdownFiles: () => [...files.values()].filter(f => f instanceof TFile && f.extension === "md"),
			getFileByPath: path => files.get(path) ?? null,
			getAbstractFileByPath: path => files.get(path) ?? null,
			read: async file => file.content,
			append: async (file, content) => { file.content += content; },
			process: async (file, fn) => { file.content = fn(file.content); return file.content; },
		},
	};
	const plugin = new Plugin(app, {});
	function emit(name, ...args) {
		for (const result of vaultEvents.emit(name, ...args)) Promise.resolve(result).catch(error => errors.push(error));
	}
	function add(file, resolved = true) {
		files.set(file.path, file);
		if (resolved) app.metadataCache.resolvedLinks[file.path] = {};
		return file;
	}
	function rename(file, path) {
		const oldPath = file.path;
		files.delete(oldPath);
		delete app.metadataCache.resolvedLinks[oldPath];
		file.path = path;
		add(file);
		emit("rename", file, oldPath);
	}
	function unload() { plugin.onunload(); plugin.cleanups.forEach(fn => fn()); }
	t.after(unload);
	return { app, plugin, files, today, opened, errors, sync, emit, add, rename, unload,
		resolve(file) { app.metadataCache.resolvedLinks[file.path] = {}; app.metadataCache.emit("resolved"); },
		async start(layout = true) { await plugin.onload(); if (layout) this.layout(); },
		layout: () => ready.forEach(fn => fn()),
		async tick(ms) { t.mock.timers.tick(ms); await flush(); },
	};
}
