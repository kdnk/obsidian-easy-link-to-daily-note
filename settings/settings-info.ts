export type EasyLinkToDailyNoteSettings = {
	dailyNoteDir: string;
	shouldAppendWebClipper: boolean;
};

export const DEFAULT_SETTINGS: EasyLinkToDailyNoteSettings = {
	dailyNoteDir: "journals",
	shouldAppendWebClipper: true,
};
