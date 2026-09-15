import type { LucideIcon } from "lucide-react";
import {
	BookOpenIcon,
	FileTextIcon,
	HighlighterIcon,
	LightbulbIcon,
	MountainIcon,
	ScrollTextIcon,
	SproutIcon,
	StarIcon,
} from "lucide-react";

export type CollectionSummary = {
	allowedContent?: readonly string[];
	description: string;
	id?: number;
	icon: LucideIcon;
	image: string;
	name: string;
	tags?: readonly string[];
	updatedAt: string;
	updatedAtValue?: number;
	createdAtValue?: number;
	visibility: "Private" | "Shared";
	counts: {
		highlights?: number;
		notes?: number;
		passages?: number;
	};
};

type StoredCollection = {
	allowedContent: string[];
	coverId: string;
	createdAt: Date | string;
	description: string;
	id: number;
	name: string;
	tags: string[];
	updatedAt: Date | string;
};

export const collectionCovers = [
	{
		alt: "Mountain peaks in soft light",
		id: "mountains",
		image:
			"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85",
	},
	{
		alt: "A quiet lake among forested hills",
		id: "lake",
		image:
			"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=85",
	},
	{
		alt: "An open Bible on a desk",
		id: "open-bible",
		image:
			"https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=85",
	},
	{
		alt: "Rocky coastline at sunset",
		id: "coastline",
		image:
			"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=85",
	},
] as const;

const contentIcons: Record<string, LucideIcon> = {
	highlights: HighlighterIcon,
	notes: FileTextIcon,
	passages: BookOpenIcon,
	"study-themes": LightbulbIcon,
};

export function toCollectionSummary(
	collection: StoredCollection,
): CollectionSummary {
	const cover =
		collectionCovers.find(
			(coverOption) => coverOption.id === collection.coverId,
		) ?? collectionCovers[0];
	const icon = collection.allowedContent
		.map((contentType) => contentIcons[contentType])
		.find(Boolean);

	return {
		allowedContent: collection.allowedContent,
		counts: {},
		createdAtValue: new Date(collection.createdAt).getTime(),
		description: collection.description,
		icon: icon ?? BookOpenIcon,
		id: collection.id,
		image: cover.image,
		name: collection.name,
		tags: collection.tags,
		updatedAt: formatUpdatedAt(collection.updatedAt),
		updatedAtValue: new Date(collection.updatedAt).getTime(),
		visibility: "Private",
	};
}

function formatUpdatedAt(updatedAt: Date | string) {
	const elapsedSeconds = Math.max(
		0,
		Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1_000),
	);
	if (elapsedSeconds < 60) return "Updated just now";

	const elapsedMinutes = Math.floor(elapsedSeconds / 60);
	if (elapsedMinutes < 60) {
		return `Updated ${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} ago`;
	}

	const elapsedHours = Math.floor(elapsedMinutes / 60);
	if (elapsedHours < 24) {
		return `Updated ${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago`;
	}

	const elapsedDays = Math.floor(elapsedHours / 24);
	return `Updated ${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
}

export const exampleCollections = [
	{
		counts: { highlights: 4, notes: 12, passages: 28 },
		description: "A deep dive into Paul's letter to the Romans.",
		icon: ScrollTextIcon,
		image:
			"https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=1200&q=85",
		name: "Romans Study",
		updatedAt: "Updated 2 days ago",
		visibility: "Private",
	},
	{
		counts: { highlights: 7, notes: 8, passages: 42 },
		description: "Key promises throughout Scripture for everyday life.",
		icon: StarIcon,
		image: collectionCovers[1].image,
		name: "Promises of God",
		updatedAt: "Updated 4 days ago",
		visibility: "Shared",
	},
	{
		counts: { highlights: 3, notes: 24, passages: 16 },
		description: "Passages and notes for current and upcoming messages.",
		icon: FileTextIcon,
		image: collectionCovers[2].image,
		name: "Sermon Notes",
		updatedAt: "Updated 1 week ago",
		visibility: "Private",
	},
	{
		counts: { highlights: 5, notes: 6, passages: 37 },
		description: "Old Testament prophecies about the coming Messiah.",
		icon: MountainIcon,
		image: collectionCovers[0].image,
		name: "Messianic Prophecies",
		updatedAt: "Updated 2 weeks ago",
		visibility: "Private",
	},
	{
		counts: { highlights: 6, notes: 10, passages: 25 },
		description: "Scriptures to guide and encourage a deeper prayer life.",
		icon: SproutIcon,
		image:
			"https://images.unsplash.com/photo-1475483768296-6163e08872a1?auto=format&fit=crop&w=1200&q=85",
		name: "Prayer Passages",
		updatedAt: "Updated 3 weeks ago",
		visibility: "Private",
	},
	{
		counts: { highlights: 4, notes: 8, passages: 31 },
		description: "Finding hope through difficult seasons.",
		icon: BookOpenIcon,
		image: collectionCovers[3].image,
		name: "Faith & Suffering",
		updatedAt: "Updated 1 month ago",
		visibility: "Shared",
	},
] as const satisfies readonly CollectionSummary[];
