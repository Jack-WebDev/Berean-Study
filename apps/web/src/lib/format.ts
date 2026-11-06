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

// Always UTC, so server and browser render the same text and staff in different
// places read the same time in a permanent record.
const staffDate = new Intl.DateTimeFormat("en-GB", {
	day: "numeric",
	month: "short",
	timeZone: "UTC",
	year: "numeric",
});
const staffDateTime = new Intl.DateTimeFormat("en-GB", {
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	month: "short",
	timeZone: "UTC",
	year: "numeric",
});

export function formatStaffDate(date: Date) {
	return staffDate.format(date);
}

export function formatStaffDateTime(date: Date) {
	return `${staffDateTime.format(date)} UTC`;
}
