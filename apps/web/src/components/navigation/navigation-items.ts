import { BookOpenIcon, InfoIcon, LibraryIcon, SearchIcon } from "lucide-react";

export const navigationItems = [
	{ hash: "browse", icon: BookOpenIcon, label: "Read" },
	{ hash: "search", icon: SearchIcon, label: "Search" },
	{ hash: "library", icon: LibraryIcon, label: "Library" },
	{ hash: "about", icon: InfoIcon, label: "About" },
] as const;
