export type ReadingSettings = {
	defaultView: "single" | "parallel" | "study";
	passageLayout: "continuous" | "verse";
	showVerseNumbers: boolean;
	showSectionHeadings: boolean;
	redLetterText: boolean;
	footnotes: boolean;
	rememberPosition: boolean;
	scrolling: "smooth" | "instant";
};

export const initialReadingSettings: ReadingSettings = {
	defaultView: "single",
	passageLayout: "continuous",
	showVerseNumbers: true,
	showSectionHeadings: true,
	redLetterText: true,
	footnotes: true,
	rememberPosition: true,
	scrolling: "smooth",
};
