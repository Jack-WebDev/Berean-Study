import { BookOpenIcon, HouseIcon, LibraryIcon, SearchIcon } from "lucide-react";

export const publicNavigationItems = [
	{ href: "/#browse", icon: BookOpenIcon, label: "Read" },
	{ href: "/#search", icon: SearchIcon, label: "Search" },
] as const;

export const authenticatedNavigationItems = [
	{ href: "/_auth/home", icon: HouseIcon, label: "Home" },
	{ href: "/bible", icon: BookOpenIcon, label: "Bible" },
	{ href: "/library", icon: LibraryIcon, label: "Library" },
] as const;
