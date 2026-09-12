export const traditions = [
	{
		value: "protestant",
		title: "Protestant",
		description: "Shows the Protestant Bible collection by default.",
		meta: "66 books",
	},
	{
		value: "catholic",
		title: "Catholic",
		description: "Includes the deuterocanonical books in your default Bible.",
		meta: "73 books",
	},
	{
		value: "eastern-orthodox",
		title: "Eastern Orthodox",
		description: "Uses the broader Eastern Orthodox Scripture collection.",
		meta: "Typically 79 books",
	},
	{
		value: "ethiopian-orthodox",
		title: "Ethiopian Orthodox Tewahedo",
		description: "Uses the Ethiopian Orthodox Tewahedo Scripture collection.",
		meta: "81 books",
	},
	{
		value: "unsure",
		title: "I’m not sure",
		description:
			"Berean Study won’t prefer one Bible tradition by default. You can still access all books and resources.",
	},
] as const;

export const translations = [
	"King James Version (KJV)",
	"New King James Version (NKJV)",
	"New International Version (NIV)",
	"New American Standard Bible (NASB)",
	"English Standard Version (ESV)",
	"New Living Translation (NLT)",
] as const;

export type Tradition = (typeof traditions)[number]["value"];
export type Translation = (typeof translations)[number];
export type Theme = "light" | "dark" | "system";
export type TextSize = "small" | "default" | "large";
export type ReadingWidth = "narrow" | "default" | "wide";
