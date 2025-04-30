export type DailyNoteCentricSettings = {
	baseDir: string;
	dailyNoteDir: string;
	shouldAppendWebClipper: boolean;
};

export const DEFAULT_SETTINGS: DailyNoteCentricSettings = {
	baseDir: "pages",
	dailyNoteDir: "journals",
	shouldAppendWebClipper: true,
};
