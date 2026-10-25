import { BookOpenIcon, PlusIcon, TagIcon, XIcon } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import type { PassageOption } from "./note-study-data";

/** Label-and-value rows shown under the note title. */
export function NoteProperties({ children }: { children: ReactNode }) {
	return (
		<div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-border border-b pb-6 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
			{children}
		</div>
	);
}

function PropertyLabel({
	children,
	htmlFor,
	icon: Icon,
}: {
	children: ReactNode;
	htmlFor?: string;
	icon: typeof TagIcon;
}) {
	const className = "flex items-center gap-2 text-muted-foreground";
	const content = (
		<>
			<Icon aria-hidden="true" className="size-4" />
			{children}
		</>
	);
	return htmlFor ? (
		<label className={className} htmlFor={htmlFor}>
			{content}
		</label>
	) : (
		<span className={className}>{content}</span>
	);
}

export function PassageProperty({
	linkedPassages,
	onLink,
	onRemove,
	translation,
}: {
	linkedPassages: readonly PassageOption[];
	onLink: () => void;
	onRemove: (passageId: number) => void;
	translation: string | null;
}) {
	return (
		<>
			<PropertyLabel icon={BookOpenIcon}>Passage</PropertyLabel>
			<ul
				aria-label="Linked passages"
				className="flex flex-wrap items-center gap-2"
			>
				{linkedPassages.map((passage) => (
					<li
						className="flex h-9 items-center gap-2 rounded-full border border-scripture-border bg-scripture pr-1.5 pl-3.5 text-scripture-foreground"
						key={passage.id}
					>
						<span className="font-serif text-[15px]">{passage.label}</span>
						{translation ? (
							<span className="text-xs">{translation}</span>
						) : null}
						<button
							aria-label={`Remove ${passage.label}`}
							className="flex size-7 items-center justify-center rounded-full hover:bg-scripture-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							onClick={() => onRemove(passage.id)}
							type="button"
						>
							<XIcon aria-hidden="true" className="size-3.5" />
						</button>
					</li>
				))}
				<li>
					{linkedPassages.length ? (
						<button
							aria-label="Link another passage"
							className="flex size-9 items-center justify-center rounded-full border border-muted-foreground/40 border-dashed text-secondary-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							onClick={onLink}
							type="button"
						>
							<PlusIcon aria-hidden="true" className="size-3.5" />
						</button>
					) : (
						<button
							className="flex h-9 items-center gap-2 rounded-full border border-muted-foreground/40 border-dashed px-3.5 text-secondary-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							onClick={onLink}
							type="button"
						>
							<PlusIcon aria-hidden="true" className="size-3.5" />
							Link a passage
						</button>
					)}
				</li>
			</ul>
		</>
	);
}

/**
 * Inline tag chips with a bare input: Enter or comma adds a tag, Backspace on
 * an empty input removes the last one, and existing tags are suggested.
 */
export function TagsProperty({
	onChange,
	suggestions,
	tags,
}: {
	onChange: (tags: string[]) => void;
	suggestions: readonly string[];
	tags: readonly string[];
}) {
	const id = useId();
	const [value, setValue] = useState("");
	const hasTag = (name: string) =>
		tags.some(
			(tag) =>
				tag.localeCompare(name, undefined, { sensitivity: "accent" }) === 0,
		);
	const addTag = (name: string) => {
		const next = name.trim().replace(/\s+/g, " ");
		if (next && next.length <= 50 && tags.length < 20 && !hasTag(next))
			onChange([...tags, next]);
		setValue("");
	};

	return (
		<>
			<PropertyLabel htmlFor={id} icon={TagIcon}>
				Tags
			</PropertyLabel>
			<div className="flex flex-wrap items-center gap-1.5">
				{tags.map((tag) => (
					<span
						className="flex h-8 items-center gap-1 rounded-lg bg-section-observe pr-1 pl-2.5 font-medium text-[13px] text-section-observe-foreground"
						key={tag}
					>
						{tag}
						<button
							aria-label={`Remove tag ${tag}`}
							className="flex size-6 items-center justify-center rounded-md hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							onClick={() => onChange(tags.filter((item) => item !== tag))}
							type="button"
						>
							<XIcon aria-hidden="true" className="size-3" />
						</button>
					</span>
				))}
				<input
					className="h-8 min-w-28 flex-1 bg-transparent px-1 text-[13px] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
					id={id}
					list={`${id}-suggestions`}
					maxLength={50}
					onBlur={() => value.trim() && addTag(value)}
					onChange={(event) => {
						const next = event.target.value;
						if (next.endsWith(",")) addTag(next.slice(0, -1));
						else setValue(next);
					}}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							addTag(value);
						} else if (event.key === "Backspace" && !value && tags.length) {
							onChange(tags.slice(0, -1));
						}
					}}
					placeholder={tags.length ? "Add tag…" : "Add a tag and press Enter"}
					value={value}
				/>
				<datalist id={`${id}-suggestions`}>
					{suggestions
						.filter((suggestion) => !hasTag(suggestion))
						.map((suggestion) => (
							<option key={suggestion} value={suggestion} />
						))}
				</datalist>
			</div>
		</>
	);
}
