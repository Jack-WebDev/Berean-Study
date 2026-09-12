import { Button } from "@berean-study/ui/components/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@berean-study/ui/components/command";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@berean-study/ui/components/dialog";
import type { LucideIcon } from "lucide-react";
import {
	ArrowRightIcon,
	BookmarkIcon,
	BookOpenIcon,
	CircleUserRoundIcon,
	FileTextIcon,
	SearchIcon,
	ShapesIcon,
	TagIcon,
	XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

type SearchResult = {
	description?: string;
	href: string;
	icon: LucideIcon;
	label: string;
	type: string;
};

const recentResults: SearchResult[] = [
	{
		href: "/bible?passage=John%203%3A16",
		icon: BookOpenIcon,
		label: "John 3:16",
		type: "Scripture",
	},
	{
		href: "/bible?passage=Romans%208",
		icon: BookOpenIcon,
		label: "Romans 8",
		type: "Scripture",
	},
	{
		href: "/bible?passage=Genesis%201",
		icon: BookOpenIcon,
		label: "Genesis 1",
		type: "Scripture",
	},
	{ href: "/themes", icon: TagIcon, label: "Covenant", type: "Theme" },
];

const suggestedResults: SearchResult[] = [
	{
		href: "/bible",
		icon: BookOpenIcon,
		label: "Browse Scripture",
		type: "Explore",
	},
	{ href: "/themes", icon: ShapesIcon, label: "Themes", type: "Study" },
	{
		href: "/search",
		icon: CircleUserRoundIcon,
		label: "People",
		type: "Explore",
	},
	{ href: "/themes", icon: BookmarkIcon, label: "Study Tools", type: "Study" },
];

const resultGroups: ReadonlyArray<{
	items: readonly SearchResult[];
	label: string;
}> = [
	{
		items: [
			{
				href: "/bible?passage=John%203%3A16",
				icon: BookOpenIcon,
				label: "John 3:16",
				type: "Verse",
			},
			{
				href: "/bible?passage=John%203",
				icon: BookOpenIcon,
				label: "John 3",
				type: "Chapter",
			},
			{
				href: "/bible?passage=John",
				icon: BookOpenIcon,
				label: "The Gospel of John",
				type: "Book",
			},
		],
		label: "Scripture",
	},
	{
		items: [
			{
				description: "God's love for the world",
				href: "/search?q=John%203%3A16",
				icon: FileTextIcon,
				label: "John 3:16",
				type: "Commentary",
			},
		],
		label: "Commentary",
	},
	{
		items: [
			{ href: "/themes", icon: TagIcon, label: "Love", type: "Theme" },
			{ href: "/themes", icon: TagIcon, label: "Salvation", type: "Theme" },
		],
		label: "Related Topics",
	},
	{
		items: [
			{
				href: "/search?q=Jesus",
				icon: CircleUserRoundIcon,
				label: "Jesus",
				type: "Person",
			},
			{
				href: "/search?q=John%20the%20Apostle",
				icon: CircleUserRoundIcon,
				label: "John the Apostle",
				type: "Person",
			},
		],
		label: "People",
	},
];

export function GlobalSearchDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [query, setQuery] = useState("");
	const normalizedQuery = query.trim().toLowerCase();
	const hasReference = /[a-z]/i.test(query) && /\d/.test(query);
	const groups = useMemo(() => {
		if (hasReference) return resultGroups;
		return resultGroups
			.map((group) => ({
				...group,
				items: group.items.filter((item) =>
					`${item.label} ${item.description ?? ""} ${item.type}`
						.toLowerCase()
						.includes(normalizedQuery),
				),
			}))
			.filter((group) => group.items.length > 0);
	}, [hasReference, normalizedQuery]);

	const navigate = (href: string) => {
		onOpenChange(false);
		window.location.assign(href);
	};
	const handleOpenChange = (nextOpen: boolean) => {
		onOpenChange(nextOpen);
		if (!nextOpen) setQuery("");
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				className="w-[calc(100vw-1.5rem)] max-w-[42.5rem] gap-0 overflow-hidden rounded-2xl border border-border bg-popover p-0 shadow-[0_20px_55px_rgb(30_42_58_/_20%)] sm:max-w-[42.5rem] md:max-h-[75dvh]"
				showCloseButton={false}
			>
				<DialogHeader className="sr-only">
					<DialogTitle>Search Berean Study</DialogTitle>
					<DialogDescription>
						Search Scripture, commentary, themes, people, and study topics.
					</DialogDescription>
				</DialogHeader>
				<Command shouldFilter={false}>
					<div className="relative border-border border-b">
						<CommandInput
							autoFocus
							className="h-14 px-4 pr-12 text-sm"
							placeholder="Search Berean Study..."
							value={query}
							wrapperClassName="h-14 border-0 bg-transparent shadow-none"
							onValueChange={setQuery}
						/>
						<DialogClose
							render={
								<Button
									aria-label="Close search"
									className="absolute top-3 right-3 rounded-md"
									size="icon-sm"
									type="button"
									variant="ghost"
								/>
							}
						>
							<XIcon aria-hidden="true" data-icon="inline-start" />
							<span className="sr-only">Close search</span>
						</DialogClose>
					</div>
					<CommandList className="max-h-[calc(100dvh-8rem)] px-2 py-2 md:max-h-[calc(75dvh-7rem)]">
						{normalizedQuery.length === 0 ? (
							<>
								<SearchGroup
									items={recentResults}
									label="Recent"
									onSelect={navigate}
								/>
								<CommandSeparator className="mx-2" />
								<SearchGroup
									items={suggestedResults}
									label="Suggested"
									onSelect={navigate}
								/>
							</>
						) : (
							<>
								{hasReference && (
									<CommandItem
										className="mx-1 rounded-lg bg-primary/8 px-3 py-3 data-selected:bg-primary/12"
										value={`Go to ${query}`}
										onSelect={() =>
											navigate(`/bible?passage=${encodeURIComponent(query)}`)
										}
									>
										<SearchIcon aria-hidden="true" className="text-primary" />
										<span className="min-w-0 flex-1">
											<span className="block font-medium">Go to {query}</span>
											<span className="mt-0.5 block text-muted-foreground text-xs">
												Open this passage
											</span>
										</span>
										<ArrowRightIcon
											aria-hidden="true"
											className="text-primary"
										/>
									</CommandItem>
								)}
								{groups.map((group, index) => (
									<div key={group.label}>
										{index > 0 || hasReference ? (
											<CommandSeparator className="mx-2" />
										) : null}
										<SearchGroup
											items={group.items}
											label={group.label}
											onSelect={navigate}
										/>
									</div>
								))}
								<CommandEmpty>No study results found.</CommandEmpty>
							</>
						)}
					</CommandList>
					<div className="hidden items-center gap-4 border-border border-t px-4 py-2.5 text-[10px] text-muted-foreground md:flex">
						<span>↑ ↓ Navigate</span>
						<span>↵ Open</span>
						<span>Esc Close</span>
						<span>⌘K Close</span>
					</div>
				</Command>
			</DialogContent>
		</Dialog>
	);
}

function SearchGroup({
	items,
	label,
	onSelect,
}: {
	items: readonly SearchResult[];
	label: string;
	onSelect: (href: string) => void;
}) {
	return (
		<CommandGroup
			className="px-1 py-1.5 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:pt-1 **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:text-[10px] **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-[0.14em]"
			heading={label}
		>
			{items.map((item) => (
				<SearchResultRow
					item={item}
					key={`${label}-${item.label}`}
					onSelect={onSelect}
				/>
			))}
		</CommandGroup>
	);
}

function SearchResultRow({
	item,
	onSelect,
}: {
	item: SearchResult;
	onSelect: (href: string) => void;
}) {
	const Icon = item.icon;
	return (
		<CommandItem
			className="rounded-lg px-3 py-2.5 data-selected:bg-primary/8"
			value={`${item.label} ${item.description ?? ""} ${item.type}`}
			onSelect={() => onSelect(item.href)}
		>
			<Icon aria-hidden="true" className="text-primary/85" />
			<span className="min-w-0 flex-1">
				<span className="block font-medium">{item.label}</span>
				{item.description && (
					<span className="mt-0.5 block truncate text-muted-foreground text-xs">
						{item.description}
					</span>
				)}
			</span>
			<CommandShortcut className="text-[10px] tracking-normal">
				{item.type}
			</CommandShortcut>
		</CommandItem>
	);
}
