import type { CommunityPostType } from "./community-post-card";

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
