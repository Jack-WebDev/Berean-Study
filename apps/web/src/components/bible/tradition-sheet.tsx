import { BottomSheet } from "@/components/reader-ui/bottom-sheet";
import { ChoiceGroup, ChoiceTile } from "@/components/reader-ui/choice-group";

type Tradition = { hasList: boolean; name: string; slug: string };

/**
 * Which church's book list Browse shows (decision D6). Churches' Bibles hold
 * different books: a Catholic Bible has Tobit, a Protestant one doesn't. This only
 * changes the list of books, not the words of the Bible.
 */
export function TraditionSheet({
	current,
	onChoose,
	onOpenChange,
	open,
	traditions,
}: {
	current: string;
	onChoose: (slug: string) => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	traditions: readonly Tradition[];
}) {
	return (
		<BottomSheet
			closeLabel="Done"
			description="Churches' Bibles include different books. This changes the list of books, not the words of the Bible."
			kind="tall"
			onOpenChange={onOpenChange}
			open={open}
			title="Which book list?"
		>
			<ChoiceGroup
				className="grid-cols-1"
				label="Book list"
				onValueChange={onChoose}
				value={current}
			>
				{traditions.map((tradition) => (
					<ChoiceTile
						className="min-h-[60px] items-start text-left"
						description={
							tradition.hasList
								? undefined
								: "Not ready yet. Shows the Protestant list for now."
						}
						key={tradition.slug}
						label={tradition.name}
						value={tradition.slug}
					/>
				))}
			</ChoiceGroup>
		</BottomSheet>
	);
}
