export type EasyLinkToDailyNoteSettings = {
	baseDir: string;
	dailyNoteDir: string;
	shouldAppendWebClipper: boolean;
};

export const DEFAULT_SETTINGS: EasyLinkToDailyNoteSettings = {
	baseDir: "pages",
	dailyNoteDir: "journals",
	shouldAppendWebClipper: true,
};
