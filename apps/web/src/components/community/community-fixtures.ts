import type { CommunityPostType } from "./community-post-card";

export const communityTopics = [
	{ label: "Faith", value: "faith" },
	{ label: "Prayer", value: "prayer" },
	{ label: "Grace", value: "grace" },
	{ label: "Bible Study", value: "bible-study" },
	{ label: "Life in Christ", value: "life-in-christ" },
	{ label: "Trials", value: "trials" },
	{ label: "Worship", value: "worship" },
	{ label: "Hope", value: "hope" },
	{ label: "Scripture Memory", value: "scripture-memory" },
	{ label: "Discipleship", value: "discipleship" },
] as const;

export type CommunityTopic = (typeof communityTopics)[number]["value"];

export type CommunityRecommendation = {
	href: string;
	id: string;
	image?: string | null;
	metadata: string;
	title: string;
	type: CommunityPostType;
};

export const communityRecommendations: CommunityRecommendation[] = [
	{
		href: "/library/collections",
		id: "trusting-god-in-transitions",
		image:
			"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=160&q=85",
		metadata: "12 items · By Marcus Lee",
		title: "Trusting God in Transitions",
		type: "collection",
	},
	{
		href: "/library/prayers",
		id: "a-prayer-for-clarity",
		image:
			"https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=160&q=85",
		metadata: "By Emily Carter",
		title: "A Prayer for Clarity",
		type: "prayer",
	},
	{
		href: "/library/testimonials",
		id: "what-the-cross-means-to-me",
		image:
			"https://images.unsplash.com/photo-1528297506728-9533d2ac3fa4?auto=format&fit=crop&w=160&q=85",
		metadata: "By Daniel Kim",
		title: "What the Cross Means to Me",
		type: "testimony",
	},
];

export type CommunitySavedPreview = {
	href: string;
	id: string;
	image?: string | null;
	savedAt: string;
	title: string;
};

export const communitySavedPreviews: CommunitySavedPreview[] = [
	{
		href: "/library/collections",
		id: "hope-in-hard-seasons",
		image:
			"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=160&q=85",
		savedAt: "Saved 3 days ago",
		title: "Hope in Hard Seasons",
	},
	{
		href: "/library/prayers",
		id: "prayers-for-my-family",
		image:
			"https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=160&q=85",
		savedAt: "Saved 1 week ago",
		title: "Prayers for My Family",
	},
];
