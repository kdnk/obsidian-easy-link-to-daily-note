import { EventRef, Events, Notice, Plugin } from "obsidian";

type SyncState = Pick<Events, "on" | "offref"> & { syncStatus?: string };

export function runAfterSync(this: Plugin, callBack: () => Promise<void>): void {
	let hasRun = false;
	let cancelled = false;
	let ref: EventRef | undefined;
	const sync = (this.app.internalPlugins as unknown as {
		plugins?: { sync?: { instance?: SyncState } };
	})?.plugins?.sync?.instance;
	const detach = () => {
		if (ref) sync?.offref(ref);
		ref = undefined;
	};
	this.register(() => { cancelled = true; detach(); });
	const run = () => {
		if (hasRun || cancelled) return;
		hasRun = true;
		detach();
		void callBack().catch(error => {
			console.error("Failed to append clipping after Sync", error);
			new Notice("Failed to append clipping to daily note. Check the console for details.");
		});
	};
	if (!sync || sync.syncStatus?.toLowerCase() === "fully synced") {
		run();
		return;
	}

	ref = sync.on("status-change", () => {
		if (sync.syncStatus?.toLowerCase() === "fully synced") run();
	});
}
