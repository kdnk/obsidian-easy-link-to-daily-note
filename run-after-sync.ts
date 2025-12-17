export function runAfterSync(callBack: any) {
	let hasRun = false;
	const sync = this.app?.internalPlugins?.plugins?.sync?.instance;
	if (!sync || sync.syncStatus?.toLowerCase() === "fully synced") {
		callBack();
		hasRun = true;
		return;
	}
	sync.on("status-change", () => {
		if (!hasRun && sync?.syncStatus?.toLowerCase() === "fully synced") {
			callBack();
			hasRun = true;
			return;
		}
	});
}
