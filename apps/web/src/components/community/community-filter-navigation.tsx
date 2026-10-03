import type { CommunityFeedView } from "@berean-study/db/community";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@berean-study/ui/components/toggle-group";

const communityFilters = [
	{ label: "Featured", value: "featured" },
	{ label: "Recent", value: "recent" },
	{ label: "Collections", value: "collection" },
	{ label: "Notes", value: "note" },
	{ label: "Testimonies", value: "testimony" },
	{ label: "Prayers", value: "prayer" },
] as const satisfies ReadonlyArray<{ label: string; value: CommunityFeedView }>;

export type CommunityFilter = CommunityFeedView;

export function CommunityFilterNavigation({
	activeFilter,
	onFilterChange,
}: {
	activeFilter: CommunityFilter;
	onFilterChange: (filter: CommunityFilter) => void;
}) {
	return (
		<nav aria-label="Community content filters">
			<ToggleGroup
				className="max-w-full flex-wrap gap-1 border-border/70 border-b pb-3"
				multiple={false}
				onValueChange={(values) => {
					const filter = communityFilters.find(
						(item) => item.value === values[0],
					)?.value;
					if (filter) onFilterChange(filter);
				}}
				spacing={1}
				value={[activeFilter]}
			>
				{communityFilters.map((filter) => (
					<ToggleGroupItem
						className="h-9 rounded-lg px-4 text-muted-foreground text-sm hover:bg-transparent hover:text-foreground data-pressed:bg-secondary data-pressed:text-secondary-foreground"
						key={filter.value}
						value={filter.value}
					>
						{filter.label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</nav>
	);
}
