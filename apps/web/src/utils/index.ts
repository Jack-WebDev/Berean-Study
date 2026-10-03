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
		return relativeDate(parsedDate);
	}

	return relativeDate(publishedAt);
}

export function relativeDate(date: Date) {
	const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
	const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

	if (Math.abs(days) < 7) return formatter.format(days, "day");

	const weeks = Math.round(days / 7);
	if (Math.abs(weeks) < 5) return formatter.format(weeks, "week");

	return formatter.format(Math.round(days / 30), "month");
}
