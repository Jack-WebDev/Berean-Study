import { formatTimeAgo } from "./dates";

export function initialsFor(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
}

export function formatPublishedAt(publishedAt: Date | string) {
	if (typeof publishedAt === "string") {
		const parsedDate = new Date(publishedAt);
		if (Number.isNaN(parsedDate.getTime())) return publishedAt;
		return formatTimeAgo(parsedDate);
	}

	return formatTimeAgo(publishedAt);
}
