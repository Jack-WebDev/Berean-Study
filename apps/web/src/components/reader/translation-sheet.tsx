import type { ReaderTranslation } from "@berean-study/db/reader";
import { CheckIcon } from "lucide-react";

import { BottomSheet } from "@/components/reader-ui/bottom-sheet";

/**
 * Translation (HANDOFF Screen 1). The list of six is fixed. Translations still
 * waiting for permission are listed quietly, so the list looks complete even
 * when only one can be read.
 */
export function TranslationSheet({
	current,
	onChoose,
	onOpenChange,
	open,
	translations,
}: {
	current: ReaderTranslation;
	onChoose: (abbreviation: string) => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	translations: readonly ReaderTranslation[];
}) {
	const others = translations.filter(
		(translation) => translation.abbreviation !== current.abbreviation,
	);
	const available = others.filter((translation) => translation.available);
	const waiting = others.filter((translation) => !translation.available);

	return (
		<BottomSheet
			kind="tall"
			onOpenChange={onOpenChange}
			open={open}
			title="Translation"
		>
			<div className="flex items-center gap-3 rounded-2xl bg-verse-selected px-4 py-3 shadow-[inset_0_0_0_2px_var(--verse-selected-ring)]">
				<div className="min-w-0 flex-1">
					<p className="font-serif text-[19px]">{current.name}</p>
					<p className="text-[15px] text-muted-foreground">
						{current.abbreviation} · You're reading this one
					</p>
				</div>
				<CheckIcon
					aria-hidden="true"
					className="size-6 shrink-0"
					strokeWidth={2.5}
				/>
			</div>

			{available.length > 0 ? (
				<ul className="mt-3 flex flex-col gap-2">
					{available.map((translation) => (
						<li key={translation.abbreviation}>
							<button
								className="reader-focus flex min-h-[60px] w-full flex-col justify-center rounded-2xl border border-border bg-card px-4 py-2 text-left hover:bg-muted"
								onClick={() => onChoose(translation.abbreviation)}
								type="button"
							>
								<span className="font-serif text-[19px]">
									{translation.name}
								</span>
								<span className="text-[15px] text-muted-foreground">
									{translation.abbreviation}
								</span>
							</button>
						</li>
					))}
				</ul>
			) : null}

			{waiting.length > 0 ? (
				<section className="mt-6" aria-labelledby="translations-waiting">
					<h3 className="font-bold text-[18px]" id="translations-waiting">
						Not available yet
					</h3>
					<p className="mt-1 text-[16px] text-muted-foreground leading-relaxed">
						We're waiting for permission from the publishers. These will appear
						here when it's given.
					</p>
					<ul className="mt-3 divide-y divide-border rounded-2xl border border-border">
						{waiting.map((translation) => (
							<li className="px-4 py-3" key={translation.abbreviation}>
								<span className="block text-[17px] text-muted-foreground">
									{translation.name}
								</span>
								<span className="text-[15px] text-muted-foreground">
									{translation.abbreviation}
								</span>
							</li>
						))}
					</ul>
				</section>
			) : null}
		</BottomSheet>
	);
}
