/** Every date in the app is written in this locale, so they all read alike. */
const locale = "en";

const minuteMs = 60 * 1000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

/** "12:58 PM". */
export function formatTime(value: Date | string) {
	return new Intl.DateTimeFormat(locale, {
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}

/** "Oct 3", adding the year only when it isn't this year. */
export function formatShortDate(value: Date | string, now = new Date()) {
	const date = new Date(value);
	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
		year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
	}).format(date);
}

/** "Oct 18, 2026". */
export function formatFullDate(value: Date | string) {
	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date(value));
}

/** "Oct 18, 2026, 3:45 PM". */
export function formatDateTime(value: Date | string) {
	return new Intl.DateTimeFormat(locale, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

/**
 * "October 2026", for grouping a timeline by month. Pass `now` to leave the
 * year off months in the current year.
 */
export function formatMonth(value: Date | string, now?: Date) {
	const date = new Date(value);
	return new Intl.DateTimeFormat(locale, {
		month: "long",
		year: date.getFullYear() === now?.getFullYear() ? undefined : "numeric",
	}).format(date);
}

/** The time of day for today, otherwise a short date. */
export function formatTimeOrDate(value: Date | string, now = new Date()) {
	const date = new Date(value);
	return calendarDaysAgo(date, now) <= 0
		? formatTime(date)
		: formatShortDate(date, now);
}

/** "Today", "Yesterday", "3 days ago", "Last week", then a short date. */
export function formatRelativeDay(value: Date | string, now = new Date()) {
	const date = new Date(value);
	const days = calendarDaysAgo(date, now);
	if (days <= 0) return "Today";
	if (days === 1) return "Yesterday";
	if (days < 7) return `${days} days ago`;
	if (days < 14) return "Last week";
	return formatShortDate(date, now);
}

/** "Just now", "5 minutes ago", "3 hours ago", "2 weeks ago", "4 months ago". */
export function formatTimeAgo(value: Date | string, now = new Date()) {
	const elapsed = Math.max(0, now.getTime() - new Date(value).getTime());
	const minutes = Math.floor(elapsed / minuteMs);
	if (minutes < 1) return "Just now";
	if (minutes < 60) return plural(minutes, "minute");
	const hours = Math.floor(elapsed / hourMs);
	if (hours < 24) return plural(hours, "hour");
	const days = Math.floor(elapsed / dayMs);
	if (days < 7) return plural(days, "day");
	const weeks = Math.floor(days / 7);
	if (weeks < 5) return plural(weeks, "week");
	return plural(Math.max(1, Math.floor(days / 30)), "month");
}

/** Whole calendar days from `date` to `now`, ignoring the time of day. */
export function calendarDaysAgo(value: Date | string, now = new Date()) {
	return Math.round((startOfDay(now) - startOfDay(new Date(value))) / dayMs);
}

/** Turns a stored "2026-10-01" into the value a month input expects. */
export function toMonthInput(happenedOn: string | null) {
	return happenedOn ? happenedOn.slice(0, 7) : "";
}

export function fromMonthInput(value: string) {
	return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : null;
}

/** "October 2026" for a stored month, without shifting it across time zones. */
export function formatHappenedOn(happenedOn: string) {
	const [year, month] = happenedOn.split("-").map(Number);
	return formatMonth(new Date(year ?? 1970, (month ?? 1) - 1, 1));
}

function startOfDay(date: Date) {
	return new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
	).getTime();
}

function plural(count: number, unit: string) {
	return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}
