import { BookOpenIcon, SearchIcon } from "lucide-react";

export const navigationItems = [
	{ hash: "browse", icon: BookOpenIcon, label: "Read" },
	{ hash: "search", icon: SearchIcon, label: "Search" },
] as const;
