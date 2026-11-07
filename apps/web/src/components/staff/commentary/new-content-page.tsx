import type { PermissionKey } from "@berean-study/db/access-catalogue";
import type { CommentaryKind } from "@berean-study/db/commentary-body";
import { Input } from "@berean-study/ui/components/input";
import { cn } from "@berean-study/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { EvidenceField, type EvidenceStep } from "../evidence/evidence-display";
import { staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StaffPage } from "../staff-page";
import type { ConnectionTab } from "../study/connections-page";
import type { LanguageTab } from "../study/language-page";

type ContentType = {
	key: string;
	name: string;
	description: string;
	fields: readonly string[];
	/** Where its editor is. */
	opens:
		| { commentary: CommentaryKind }
		| { connection: ConnectionTab }
		| { evidence: EvidenceStep }
		| { language: LanguageTab }
		| { page: "questions" | "themes" };
	needs?: PermissionKey;
	note?: string;
};

const families: readonly {
	name: string;
	editor: string;
	types: readonly ContentType[];
}[] = [
	{
		editor: "Commentary editor",
		name: "Commentary",
		types: [
			{
				description: "Author, date, audience, purpose and structure of a book.",
				fields: ["Book", "Introduction sections", "Body", "Citations"],
				key: "intro",
				name: "Book introduction",
				opens: { commentary: "book_introduction" },
			},
			{
				description: "Commentary on a range, such as Romans 8:18–30.",
				fields: ["Passage range", "Title", "Sections", "Body", "Citations"],
				key: "passage",
				name: "Passage commentary",
				opens: { commentary: "passage_commentary" },
			},
			{
				description: "A focused note on one verse.",
				fields: ["Verse", "Body", "Citations"],
				key: "verse",
				name: "Verse commentary",
				opens: { commentary: "verse_commentary" },
			},
			{
				description:
					"A titled part inside a commentary. Open the commentary to add, move or remove one.",
				fields: ["Parent commentary", "Section title", "Covers verses", "Body"],
				key: "section",
				name: "Commentary section",
				note: "Sections are added inside a commentary, so this opens the list of them.",
				opens: { commentary: "passage_commentary" },
			},
		],
	},
	{
		editor: "Link editor",
		name: "Connections",
		types: [
			{
				description: "Two passages that shed light on each other.",
				fields: ["From passage", "To passage", "Kind of link", "Note"],
				key: "xref",
				name: "Cross-reference",
				opens: { connection: "cross_reference" },
			},
			{
				description: "Quotation, allusion or fulfilment across the canon.",
				fields: ["Source passage", "Target passage", "Relationship", "Note"],
				key: "canon",
				name: "Canonical relationship",
				opens: { connection: "canonical_relationship" },
			},
			{
				description: "Connects a passage to a theme.",
				fields: ["Theme", "Passage", "Role in the theme", "Note"],
				key: "themepass",
				name: "Theme passage",
				note: "Passages are reviewed with their theme, so this adds to the theme's draft.",
				opens: { connection: "theme_passage" },
			},
		],
	},
	{
		editor: "Structured editor",
		name: "Interpretation & themes",
		types: [
			{
				description: "A biblical theme traced across Scripture.",
				fields: ["Name", "Summary", "Description", "Theme passages"],
				key: "theme",
				name: "Theme",
				opens: { page: "themes" },
			},
			{
				description: "A point where faithful readers differ.",
				fields: ["Passage", "Question", "Why it matters", "Views"],
				key: "question",
				name: "Interpretive question",
				opens: { page: "questions" },
			},
			{
				description: "One answer to an interpretive question.",
				fields: ["Question", "View name", "Argument", "Held by", "Citations"],
				key: "view",
				name: "Interpretation view",
				note: "Views are reviewed and published with their question, so this opens a question.",
				opens: { page: "questions" },
			},
		],
	},
	{
		editor: "Text-critical editor",
		name: "Language & text",
		types: [
			{
				description: "Greek or Hebrew word, form and meaning.",
				fields: ["Passage & word", "Lemma & parsing", "Note", "Citations"],
				key: "lang",
				name: "Original-language note",
				needs: "content.original_language",
				opens: { language: "original_language_note" },
			},
			{
				description: "A plain-language note about the text's history.",
				fields: ["Passage", "Note", "Related variants"],
				key: "tnote",
				name: "Textual note",
				needs: "content.original_language",
				opens: { language: "textual_note" },
			},
			{
				description: "Competing readings with their witnesses.",
				fields: ["Passage", "Readings", "Witnesses", "Preferred reading"],
				key: "variant",
				name: "Textual variant",
				needs: "content.original_language",
				opens: { language: "textual_variant" },
			},
		],
	},
	{
		editor: "Evidence workbench",
		name: "Evidence",
		types: [
			{
				description: "A book, article, lexicon or edition.",
				fields: ["Type", "Author(s)", "Title & edition", "Publisher & year"],
				key: "source",
				name: "Source",
				needs: "sources.manage",
				opens: { evidence: "source" },
			},
			{
				description: "A quoted or summarised passage from a source.",
				fields: ["Source", "Location", "Excerpt or summary", "Passages"],
				key: "excerpt",
				name: "Source excerpt",
				needs: "sources.manage",
				opens: { evidence: "excerpt" },
			},
			{
				description: "A statement Berean Study makes that needs support.",
				fields: ["Statement", "Passage", "Supporting citations", "Confidence"],
				key: "claim",
				name: "Claim",
				needs: "sources.manage",
				opens: { evidence: "claim" },
			},
			{
				description: "Links a claim to a source excerpt.",
				fields: ["Source excerpt", "Locator", "What it supports"],
				key: "citation",
				name: "Citation",
				needs: "sources.manage",
				note: "A citation is checked with the claim it supports, so it's added to a claim.",
				opens: { evidence: "citation" },
			},
		],
	},
];

const allTypes = families.flatMap(({ types }) => types);

function canOpen(type: ContentType, keys: readonly PermissionKey[]) {
	if (type.needs) return keys.includes(type.needs);
	return keys.includes("content.write") || keys.includes("content.revise");
}

export function NewContentPage({
	initialPassage,
	permissionKeys,
}: {
	initialPassage: string;
	permissionKeys: readonly PermissionKey[];
}) {
	const [passage, setPassage] = useState(initialPassage);
	const [pickedKey, setPickedKey] = useState("passage");
	const picked = allTypes.find(({ key }) => key === pickedKey) ?? allTypes[0];
	if (!picked) return null;
	const open = canOpen(picked, permissionKeys);
	const startPassage = passage.trim() || undefined;

	return (
		<StaffPage
			description="Whatever you add is saved as a draft and reaches readers only after review."
			section="New content"
			title="What are you adding?"
		>
			<EvidenceField
				hint="Optional. Fills in the passage in whatever you create."
				label="Start from a passage"
			>
				{(id) => (
					<Input
						className="h-11 max-w-md rounded-[0.625rem] text-sm"
						id={id}
						maxLength={100}
						onChange={(event) => setPassage(event.target.value)}
						placeholder="Romans 8:28"
						value={passage}
					/>
				)}
			</EvidenceField>

			<div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
				<div className="min-w-0 space-y-4">
					{families.map((family) => (
						<StaffCard key={family.name}>
							<div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
								<h2 className="font-serif text-xl tracking-[-0.01em]">
									{family.name}
								</h2>
								<span className="text-muted-foreground text-xs">
									Opens in: {family.editor}
								</span>
							</div>
							<div className="grid gap-2 sm:grid-cols-2">
								{family.types.map((type) => (
									<button
										aria-pressed={type.key === pickedKey}
										className={cn(
											"flex min-h-22 flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
											type.key === pickedKey
												? "border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
												: "border-border-subtle hover:bg-muted",
										)}
										key={type.key}
										onClick={() => setPickedKey(type.key)}
										type="button"
									>
										<span className="font-semibold text-sm">{type.name}</span>
										<span className="text-xs opacity-80">
											{type.description}
										</span>
									</button>
								))}
							</div>
						</StaffCard>
					))}
				</div>

				<aside className="space-y-4 lg:sticky lg:top-4">
					<StaffCard>
						<p className="font-bold text-[0.6875rem] text-muted-foreground uppercase tracking-[0.16em]">
							You're creating
						</p>
						<h2 className="mt-2 font-serif text-xl tracking-[-0.01em]">
							{picked.name}
						</h2>
						<p className="mt-1 text-muted-foreground text-sm">
							{picked.description}
						</p>
						<p className="mt-4 font-semibold text-sm">You'll fill in</p>
						<ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
							{picked.fields.map((field) => (
								<li key={field}>{field}</li>
							))}
						</ul>
						{picked.note ? (
							<p className="mt-3 text-muted-foreground text-xs">
								{picked.note}
							</p>
						) : null}
						<div className="mt-4">
							<OpenEditorLink
								canOpen={open}
								passage={startPassage}
								type={picked}
							/>
						</div>
					</StaffCard>
					<StaffCard>
						<p className="text-muted-foreground text-sm">
							Everyone's work goes to a reviewer, including Admins and
							Superadmins. Authority doesn't skip review.
						</p>
					</StaffCard>
				</aside>
			</div>
		</StaffPage>
	);
}

function OpenEditorLink({
	canOpen: allowed,
	passage,
	type,
}: {
	canOpen: boolean;
	passage?: string;
	type: ContentType;
}) {
	const primary = cn(
		staffLinkClassName,
		"w-full bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
	);
	if (!allowed) {
		return (
			<p className="text-muted-foreground text-sm">
				You don't have permission to create this.
			</p>
		);
	}
	if ("commentary" in type.opens) {
		return (
			<Link
				className={primary}
				search={{ kind: type.opens.commentary, passage }}
				to="/work/commentary"
			>
				Open editor
			</Link>
		);
	}
	if ("connection" in type.opens) {
		return (
			<Link
				className={primary}
				search={{ passage, tab: type.opens.connection }}
				to="/work/connections"
			>
				Open editor
			</Link>
		);
	}
	if ("language" in type.opens) {
		return (
			<Link
				className={primary}
				search={{ passage, tab: type.opens.language }}
				to="/work/language"
			>
				Open editor
			</Link>
		);
	}
	if ("page" in type.opens) {
		const to =
			type.opens.page === "themes" ? "/work/themes" : "/work/questions";
		return (
			<div className="space-y-2">
				<Link className={primary} search={{ new: true, passage }} to={to}>
					Open editor
				</Link>
				<Link className={cn(staffLinkClassName, "w-full")} to={to}>
					Find an existing one
				</Link>
			</div>
		);
	}
	return (
		<Link
			className={primary}
			search={{ passage, step: type.opens.evidence }}
			to="/work/sources/evidence"
		>
			Open editor
		</Link>
	);
}
