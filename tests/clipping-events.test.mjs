import assert from "node:assert/strict";
import test from "node:test";
import { fixture, flush, TFile, TFolder } from "./helpers.mjs";

test("an old clipping arriving through Sync must not add the reported line or open today", async t => {
	const f = fixture(t);
	await f.start();
	const file = f.add(new TFile("pages/えぇ/ただ置いていただくだけで結構です - ばかもりだし.md", 1711176395328));
	f.emit("create", file);
	await flush();
	assert.equal(f.today.content, "Existing daily note");
	assert.deepEqual(f.opened, []);
});

test("a renamed clipping created earlier today is not a new clipping", async t => {
	const f = fixture(t);
	await f.start();
	const file = f.add(new TFile("pages/renamed_.md", Date.now() - 60000));
	file.stat.mtime = Date.now();
	f.emit("create", file);
	await flush();
	assert.equal(f.today.content, "Existing daily note");
	assert.deepEqual(f.opened, []);
});

test("new clippings still append and open today, once per file despite duplicate events", async t => {
	const f = fixture(t);
	await f.start();
	await f.tick(10);
	const file = f.add(new TFile("pages/New clip.md"));
	f.emit("create", file);
	f.emit("create", file);
	await flush();
	assert.equal(f.today.content, "Existing daily note\n- 22:42 [[New clip]] ");
	assert.deepEqual(f.opened, ["journals/2026-09-08.md"]);
	assert.deepEqual(f.errors, []);
});

test("startup loading and files already present at layout are never logged", async t => {
	const f = fixture(t);
	await f.start(false);
	const file = f.add(new TFile("pages/Restored.md"));
	f.emit("create", file);
	f.layout();
	f.emit("create", file);
	await flush();
	assert.equal(f.today.content, "Existing daily note");
	assert.deepEqual(f.opened, []);
});

test("waiting for metadata uses the final path after a new clipping is renamed", async t => {
	const f = fixture(t);
	await f.start();
	await f.tick(10);
	const file = f.add(new TFile("pages/New?.md"), false);
	f.emit("create", file);
	await flush();
	f.rename(file, "pages/New_.md");
	f.resolve(file);
	await f.tick(50);
	assert.equal(f.today.content, "Existing daily note\n- 22:42 [[New_]] ");
});

for (const action of ["delete", "replace", "unload"]) {
	test(`${action} while metadata is pending must cancel the append`, async t => {
		const f = fixture(t);
		await f.start();
		await f.tick(10);
		const file = f.add(new TFile("pages/Pending.md"), false);
		f.emit("create", file);
		await flush();
		if (action === "delete") f.files.delete(file.path);
		if (action === "replace") f.add(new TFile(file.path));
		if (action === "unload") f.unload();
		f.resolve(file);
		await f.tick(50);
		assert.equal(f.today.content, "Existing daily note");
		assert.deepEqual(f.opened, []);
	});
}

test("sync waiting captures the current path, without opening today before appending", async t => {
	const f = fixture(t);
	await f.start();
	await f.tick(10);
	f.sync.syncStatus = "Syncing";
	const file = f.add(new TFile("pages/New?.md"));
	f.emit("create", file);
	await flush();
	assert.deepEqual(f.opened, []);
	f.rename(file, "pages/New_.md");
	f.sync.syncStatus = "Fully synced";
	f.sync.emit("status-change");
	await flush();
	assert.equal(f.today.content, "Existing daily note\n- 22:42 [[New_]] ");
	assert.deepEqual(f.opened, ["journals/2026-09-08.md"]);
});

test("unloading while Sync is pending cancels later writes", async t => {
	const f = fixture(t);
	await f.start();
	await f.tick(10);
	f.sync.syncStatus = "Syncing";
	f.emit("create", f.add(new TFile("pages/New.md")));
	await flush();
	f.unload();
	f.sync.syncStatus = "Fully synced";
	f.sync.emit("status-change");
	await flush();
	assert.equal(f.today.content, "Existing daily note");
	assert.deepEqual(f.opened, []);
});

test("folders, attachments, unknown creation times and non-clippings are ignored", async t => {
	const f = fixture(t);
	await f.start();
	await f.tick(10);
	for (const file of [new TFolder("pages/folder"), new TFile("pages/image.png"), new TFile("pages/unknown.md", NaN), new TFile("pages/ordinary.md", Date.now(), "other")]) {
		f.emit("create", f.add(file));
	}
	await flush();
	assert.equal(f.today.content, "Existing daily note");
	assert.deepEqual(f.opened, []);
	assert.deepEqual(f.errors, []);
});

test("an already linked clipping does not append or steal focus", async t => {
	const f = fixture(t);
	await f.start();
	await f.tick(10);
	f.today.content = "Already [[New]]";
	f.emit("create", f.add(new TFile("pages/New.md")));
	await flush();
	assert.equal(f.today.content, "Already [[New]]");
	assert.deepEqual(f.opened, []);
});

test("a new clipping still appends when metadata takes longer than ten seconds", async t => {
	const f = fixture(t);
	await f.start();
	await f.tick(10);
	const file = f.add(new TFile("pages/Slow import.md"), false);
	f.emit("create", file);
	await flush();
	for (let i = 0; i < 201; i++) await f.tick(50);
	f.resolve(file);
	await flush();
	assert.equal(f.today.content, "Existing daily note\n- 22:42 [[Slow import]] ");
});

test("a new synced clipping tolerates the source device clock being ahead", async t => {
	const f = fixture(t);
	await f.start();
	await f.tick(10);
	const file = f.add(new TFile("pages/Synced clip.md", Date.now() + 1000));
	f.emit("create", file);
	await f.tick(2000);
	f.resolve(file);
	await flush();
	assert.equal(f.today.content, "Existing daily note\n- 22:42 [[Synced clip]] ");
});

test("Sync crossing midnight preserves the original daily note and capture time", async t => {
	const f = fixture(t);
	await f.start();
	await f.tick(77 * 60000 + 59000); // 23:59:59 JST
	f.sync.syncStatus = "Syncing";
	f.emit("create", f.add(new TFile("pages/Late clip.md")));
	await flush();
	await f.tick(2000);
	const tomorrow = f.add(new TFile("journals/2026-09-09.md"));
	tomorrow.content = "Next day";
	f.sync.syncStatus = "Fully synced";
	f.sync.emit("status-change");
	await flush();
	assert.equal(f.today.content, "Existing daily note\n- 23:59 [[Late clip]] ");
	assert.equal(tomorrow.content, "Next day");
});
