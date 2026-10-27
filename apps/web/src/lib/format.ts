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
