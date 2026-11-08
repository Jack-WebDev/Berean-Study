import {
	type ReadingTextSize,
	readingTextSizeDetails,
	readingTextSizes,
} from "@berean-study/db/reader-catalogue";

import { BottomSheet } from "@/components/reader-ui/bottom-sheet";
import { ChoiceGroup, ChoiceTile } from "@/components/reader-ui/choice-group";

/** The "A" on each tile, drawn bigger for each size. */
const glyphPixels: Record<ReadingTextSize, number> = {
	standard: 20,
	large: 25,
	larger: 30,
	largest: 36,
};

/**
 * Text size (HANDOFF Screen 1). A light sheet, so the verses stay visible and
 * change size the moment a tile is tapped.
 */
export function TextSizeSheet({
	onOpenChange,
	onTextSizeChange,
	open,
	textSize,
}: {
	onOpenChange: (open: boolean) => void;
	onTextSizeChange: (size: ReadingTextSize) => void;
	open: boolean;
	textSize: ReadingTextSize;
}) {
	return (
		<BottomSheet
			closeLabel="Done"
			description="The words above change as you tap."
			kind="light"
			onOpenChange={onOpenChange}
			open={open}
			title="Text size"
		>
			<ChoiceGroup
				className="grid-cols-2 min-[360px]:grid-cols-4"
				label="Text size"
				onValueChange={onTextSizeChange}
				value={textSize}
			>
				{readingTextSizes.map((size) => (
					<ChoiceTile
						className="h-[92px]"
						key={size}
						label={readingTextSizeDetails[size].label}
						value={size}
					>
						<span
							aria-hidden="true"
							className="font-serif leading-none"
							style={{ fontSize: glyphPixels[size] }}
						>
							A
						</span>
					</ChoiceTile>
				))}
			</ChoiceGroup>
		</BottomSheet>
	);
}
