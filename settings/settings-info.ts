export type EasyUniqueNoteSettings = {
	baseDir: string;
	dailyNoteDir: string;
	shouldAppendWebClipper: boolean;
};

export const DEFAULT_SETTINGS: EasyUniqueNoteSettings = {
	baseDir: "pages",
	dailyNoteDir: "journals",
	shouldAppendWebClipper: true,
};
