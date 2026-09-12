export function getInitials(name: string) {
	return (
		name
			.trim()
			.split(/\s+/)
			.map((part) => part[0])
			.join("")
			.slice(0, 2)
			.toUpperCase() || "?"
	);
}

type FormatDateOptions = Intl.DateTimeFormatOptions & {
	locale?: string | string[];
};

export function formatDate(
	value: string | Date,
	{ locale = "en", ...options }: FormatDateOptions = {},
) {
	if (options.dateStyle || options.timeStyle) {
		return new Intl.DateTimeFormat(locale, options).format(new Date(value));
	}

	return new Intl.DateTimeFormat(locale, {
		month: "long",
		year: "numeric",
		...options,
	}).format(new Date(value));
}
