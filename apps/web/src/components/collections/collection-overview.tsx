import { Button } from "@berean-study/ui/components/button";
import { PencilIcon } from "lucide-react";

import { formatFullDate } from "@/utils/dates";

import { typeLabel, visibilityLabel } from "./collection-library";
import type { CollectionDetail } from "./use-collection-actions";

/** The Overview tab: the collection's description and details. */
export function CollectionOverview({
	detail,
	onEdit,
}: {
	detail: CollectionDetail;
	onEdit: () => void;
}) {
	const { collection, sections } = detail;
	const rows = [
		["Type", typeLabel(collection.type)],
		["Who can see it", visibilityLabel(collection.visibility)],
		["Passages", String(collection.passageCount)],
		["Sections", String(sections.length)],
		["Notes", String(collection.noteCount)],
		...(collection.progress === null
			? []
			: [
					[
						"Progress",
						`${collection.readCount} of ${collection.passageCount} read (${collection.progress}%)`,
					],
				]),
		["Created", formatFullDate(collection.createdAt)],
		["Last updated", formatFullDate(collection.updatedAt)],
		[
			"Tags",
			collection.tags.length
				? collection.tags.map((tag) => `#${tag}`).join(", ")
				: "None",
		],
	] as const;

	return (
		<div className="flex max-w-170 flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h2 className="font-serif text-[1.375rem]">About this collection</h2>
				<p className="text-[15px] text-body-foreground">
					{collection.description || "No description yet."}
				</p>
			</div>
			<dl className="grid grid-cols-[minmax(0,10rem)_1fr] gap-x-6 rounded-2xl border border-border bg-card px-5 py-2">
				{rows.map(([label, value]) => (
					<div
						className="col-span-2 grid grid-cols-subgrid border-border-subtle border-b py-3 last:border-b-0"
						key={label}
					>
						<dt className="text-muted-foreground">{label}</dt>
						<dd className="font-semibold">{value}</dd>
					</div>
				))}
			</dl>
			<Button
				className="h-11 self-start rounded-xl px-4 text-sm"
				onClick={onEdit}
				type="button"
				variant="outline"
			>
				<PencilIcon aria-hidden="true" data-icon="inline-start" />
				Edit details
			</Button>
		</div>
	);
}
