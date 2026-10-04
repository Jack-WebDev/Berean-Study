import type { NavigationItem } from "./navigation-items";

export function isCurrentLocation(
	pathname: string,
	item: NavigationItem,
	hash = "",
) {
	const routeMatches = [item.href, ...(item.activePaths ?? [])].some(
		(href) =>
			pathname === href ||
			(!item.exact && href !== "/home" && pathname.startsWith(`${href}/`)),
	);

	return routeMatches && (item.hash === undefined || item.hash === hash);
}
