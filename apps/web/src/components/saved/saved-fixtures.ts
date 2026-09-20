export type CommunityResourceType =
	| "Collection"
	| "Note"
	| "Prayer"
	| "Testimony";

export type BookmarkItem = ScriptureBookmark | CommunityBookmark;

type BookmarkItemBase = {
	description: string;
	href: string;
	id: string;
	savedAt: string;
	title: string;
	thumbnailPosition: string;
};

type ScriptureBookmark = BookmarkItemBase & {
	kind: "scripture";
	translation: string;
};

type CommunityBookmark = BookmarkItemBase & {
	author: string;
	authorInitials: string;
	kind: "community";
	meta?: string;
	resourceType: CommunityResourceType;
};

export type HighlightColor = "Blue" | "Green" | "Red" | "Yellow";
export type HighlightTestament = "New" | "Old";

export type SavedHighlightFixture = {
	book: string;
	color: HighlightColor;
	createdAt: string;
	displayDate: string;
	highlightEnd: number;
	highlightStart: number;
	id: string;
	reference: string;
	testament: HighlightTestament;
	text: string;
	translation: string;
};

export const savedFixtures = {
	bookmarks: [
		{
			description:
				"For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.",
			href: "/bible?passage=John%203%3A16",
			id: "john-3-16",
			kind: "scripture",
			savedAt: "Saved today, 10:24 AM",
			title: "John 3:16",
			thumbnailPosition: "object-[48%_35%]",
			translation: "ESV",
		},
		{
			author: "Sarah Mitchell",
			authorInitials: "SM",
			description:
				"After a long season of uncertainty, God showed me His faithfulness in ways I never expected. This testimony is a reminder that He is always working…",
			href: "#faithfulness-waiting",
			id: "faithfulness-waiting",
			kind: "community",
			resourceType: "Testimony",
			savedAt: "Saved yesterday, 4:17 PM",
			title: "God’s Faithfulness in the Waiting",
			thumbnailPosition: "object-[30%_55%]",
		},
		{
			author: "James Carter",
			authorInitials: "JC",
			description:
				"Please join me in praying for my family during this season. We are facing some difficult decisions and would appreciate your prayers for wisdom and peace.",
			href: "#pray-family",
			id: "pray-family",
			kind: "community",
			resourceType: "Prayer",
			savedAt: "Saved Mar 12, 2024",
			title: "Pray for My Family",
			thumbnailPosition: "object-[64%_46%]",
		},
		{
			author: "Grace Walker",
			authorInitials: "GW",
			description:
				"A collection of verses that have brought me hope and peace during difficult seasons.",
			href: "#hard-seasons",
			id: "hard-seasons",
			kind: "community",
			meta: "12 passages",
			resourceType: "Collection",
			savedAt: "Saved Mar 8, 2024",
			title: "Encouragement for Hard Seasons",
			thumbnailPosition: "object-[76%_65%]",
		},
	] satisfies readonly BookmarkItem[],
	highlights: [
		{
			book: "John",
			color: "Red",
			createdAt: "2026-03-12",
			displayDate: "Today",
			highlightEnd: 26,
			highlightStart: 0,
			id: "john-3-16-loved-world",
			reference: "John 3:16",
			testament: "New",
			text: "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.",
			translation: "ESV",
		},
		{
			book: "Philippians",
			color: "Green",
			createdAt: "2026-03-08",
			displayDate: "Mar 8",
			highlightEnd: 33,
			highlightStart: 0,
			id: "philippians-4-6-anxious",
			reference: "Philippians 4:6–7",
			testament: "New",
			text: "Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.",
			translation: "ESV",
		},
		{
			book: "Psalm",
			color: "Yellow",
			createdAt: "2026-03-02",
			displayDate: "Mar 2",
			highlightEnd: 27,
			highlightStart: 0,
			id: "psalm-23-1-shepherd",
			reference: "Psalm 23:1",
			testament: "Old",
			text: "The Lord is my shepherd; I shall not want.",
			translation: "ESV",
		},
		{
			book: "Romans",
			color: "Blue",
			createdAt: "2026-02-24",
			displayDate: "Feb 24",
			highlightEnd: 28,
			highlightStart: 0,
			id: "romans-8-28-good",
			reference: "Romans 8:28",
			testament: "New",
			text: "And we know that for those who love God all things work together for good.",
			translation: "ESV",
		},
	] satisfies readonly SavedHighlightFixture[],
};
