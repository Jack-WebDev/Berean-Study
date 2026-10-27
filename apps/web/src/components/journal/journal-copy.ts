/*
 * Fixed wording for the Prayer Journal: suggested prayer categories, guiding
 * questions, and the short verses shown on cards.
 */

export type JournalTab = "prayers" | "reflections" | "testimonies";

export const journalTabs: readonly {
	label: string;
	newLabel: string;
	tab: JournalTab;
}[] = [
	{ label: "Prayers", newLabel: "New prayer", tab: "prayers" },
	{ label: "Testimonies", newLabel: "New testimony", tab: "testimonies" },
	{ label: "Reflections", newLabel: "New reflection", tab: "reflections" },
];

/**
 * Categories offered as chips. A member can still type their own.
 * TODO: replace this list with a table a superadmin manages in the app.
 */
export const suggestedPrayerCategories = [
	"Request",
	"Thanksgiving",
	"Intercession",
	"Confession",
	"Guidance",
] as const;

export type TagTone = "gold" | "green" | "navy" | "neutral";

const categoryTones: Record<string, TagTone> = {
	confession: "neutral",
	guidance: "navy",
	healing: "green",
	intercession: "green",
	request: "navy",
	thanksgiving: "gold",
};

/** Known categories keep their colour; others get a stable colour from their name. */
export function categoryTone(category: string): TagTone {
	const known = categoryTones[category.trim().toLowerCase()];
	if (known) return known;
	const tones: TagTone[] = ["navy", "green", "gold", "neutral"];
	const hash = [...category].reduce(
		(sum, letter) => sum + letter.charCodeAt(0),
		0,
	);
	return tones[hash % tones.length] ?? "neutral";
}

export const guidingQuestions = [
	"What has changed since you first prayed this?",
	"What is God teaching you while you wait?",
	"Where have you seen His hand in this?",
] as const;

/** "Today's prompt" on the Reflections tab rotates through these by day. */
export const dailyReflectionPrompts = [
	...guidingQuestions,
	"What are you more thankful for now than when you started?",
	"How has this prayer changed the way you pray?",
	"What would you tell someone praying for the same thing?",
	"Which verse has held you up while praying this?",
] as const;

export function promptForDay(date: Date) {
	const day = Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
	return (
		dailyReflectionPrompts[day % dailyReflectionPrompts.length] ??
		guidingQuestions[0]
	);
}

export const testimonyStarters = [
	"A need that was met unexpectedly",
	"A season God carried you through",
	"A changed heart — yours or someone’s",
	"How you came to faith",
] as const;

export type FeaturedVerse = { reference: string; text: string };

export const journalVerses = {
	keepPraying: {
		reference: "1 Thessalonians 5:17",
		text: "Pray without ceasing.",
	},
	prayers: {
		reference: "Philippians 4:6",
		text: "Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.",
	},
	reflections: {
		reference: "Psalm 77:11",
		text: "I will remember the deeds of the Lord; yes, I will remember your wonders of old.",
	},
	testimonies: {
		reference: "Psalm 9:1",
		text: "I will give thanks to the Lord with my whole heart; I will recount all of your wonderful deeds.",
	},
} satisfies Record<string, FeaturedVerse>;
