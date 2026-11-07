import {
	type CanonicalRelationshipBody,
	type CrossReferenceBody,
	canonicalRelationshipBodySchema,
	canonicalRelationshipLabels,
	crossReferenceBodySchema,
	crossReferenceKindLabels,
	textFormLabels,
} from "@berean-study/db/connection-body";
import {
	type QuestionBody,
	questionBodySchema,
	questionDocuments,
	questionStanceLabels,
	type ThemeBody,
	themeBodySchema,
	themePassageRoleLabels,
	viewLetter,
} from "@berean-study/db/interpretation-body";
import {
	noteLanguageLabels,
	type OriginalLanguageNoteBody,
	originalLanguageNoteBodySchema,
	type TextualNoteBody,
	type TextualVariantBody,
	textualNoteBodySchema,
	textualVariantBodySchema,
	variantConfidenceLabels,
	variantKindLabels,
} from "@berean-study/db/language-body";
import { RichTextRenderer } from "@berean-study/rich-text-editor";
import type { RichTextDocument } from "@berean-study/rich-text-editor/document";
import type { CSSProperties, ReactNode } from "react";

import { StaffCard } from "../staff-card";
import { StatusChip } from "../status-chip";
import { citationsBefore } from "./study-shared";

function PreviewFrame({
	children,
	title,
}: {
	children: ReactNode;
	title: string;
}) {
	return (
		<StaffCard>
			<p className="font-bold text-[0.6875rem] text-muted-foreground uppercase tracking-[0.16em]">
				Preview as reader
			</p>
			<h2 className="mt-2 font-serif text-2xl tracking-[-0.01em]">
				{title || "Untitled"}
			</h2>
			<div className="mt-3 space-y-3 text-sm">{children}</div>
		</StaffCard>
	);
}

function Writing({
	ariaLabel,
	citationOffset = 0,
	document,
}: {
	ariaLabel: string;
	citationOffset?: number;
	document: RichTextDocument;
}) {
	return (
		<div style={{ "--citation-offset": citationOffset } as CSSProperties}>
			<RichTextRenderer
				ariaLabel={ariaLabel}
				document={document}
				preset="contributor"
				variant="plain"
			/>
		</div>
	);
}

function QuestionPreview({
	body,
	title,
}: {
	body: QuestionBody;
	title: string;
}) {
	const documents = questionDocuments(body);
	return (
		<PreviewFrame title={body.question || title}>
			<p className="text-muted-foreground">{body.passage}</p>
			{body.whyItMatters ? <p>{body.whyItMatters}</p> : null}
			<p className="text-muted-foreground">
				{questionStanceLabels[body.stance]}
			</p>
			{body.views.map((view, index) => (
				<section
					className="rounded-xl border border-border-subtle p-3"
					key={view.key}
				>
					<h3 className="flex flex-wrap items-center gap-2 font-serif text-lg">
						{viewLetter(index)}. {view.name || "Untitled view"}
						{body.preferredViewKey === view.key ? (
							<StatusChip tone="success">Preferred</StatusChip>
						) : null}
					</h3>
					<Writing
						ariaLabel={view.name || "View"}
						citationOffset={citationsBefore(documents, index)}
						document={view.argument}
					/>
					{view.heldBy.length > 0 ? (
						<p className="mt-2 text-muted-foreground text-xs">
							Held by {view.heldBy.map(({ label }) => label).join("; ")}
						</p>
					) : null}
				</section>
			))}
		</PreviewFrame>
	);
}

function ThemePreview({ body }: { body: ThemeBody }) {
	return (
		<PreviewFrame title={body.name}>
			<p className="text-muted-foreground">{body.summary}</p>
			<Writing ariaLabel="Description" document={body.description} />
			<ul className="space-y-2">
				{body.passages.map((passage) => (
					<li key={passage.key}>
						<span className="font-medium">{passage.reference}</span>{" "}
						<span className="text-muted-foreground text-xs">
							{themePassageRoleLabels[passage.role]}
						</span>
						{passage.why ? <p>{passage.why}</p> : null}
					</li>
				))}
			</ul>
		</PreviewFrame>
	);
}

/** How a theme appears on its card, with passage and key text counts. */
export function ThemePreviewCard({ body }: { body: ThemeBody }) {
	const keyTexts = body.passages.filter(({ role }) => role === "key_text");
	return (
		<StaffCard>
			<p className="font-bold text-[0.6875rem] text-muted-foreground uppercase tracking-[0.16em]">
				Reader preview · Theme
			</p>
			<h2 className="mt-2 font-serif text-2xl tracking-[-0.01em]">
				{body.name || "Untitled theme"}
			</h2>
			<p className="mt-1 text-muted-foreground text-sm">
				{body.summary || "The summary shows here."}
			</p>
			<p className="mt-3 text-muted-foreground text-xs">
				{body.passages.length}{" "}
				{body.passages.length === 1 ? "passage" : "passages"} ·{" "}
				{keyTexts.length} {keyTexts.length === 1 ? "key text" : "key texts"}
			</p>
		</StaffCard>
	);
}

function OriginalLanguageNotePreview({
	body,
}: {
	body: OriginalLanguageNoteBody;
}) {
	return (
		<PreviewFrame title={body.word}>
			<p className="text-muted-foreground">
				{noteLanguageLabels[body.language]} · {body.passage}
			</p>
			<p>
				<span className="font-medium">{body.gloss}</span>
				{body.lemma ? ` · ${body.lemma}` : ""}
				{body.parsing ? ` · ${body.parsing}` : ""}
				{body.lexiconKey ? ` · ${body.lexiconKey}` : ""}
			</p>
			<Writing ariaLabel="Note" document={body.note} />
		</PreviewFrame>
	);
}

function TextualNotePreview({ body }: { body: TextualNoteBody }) {
	return (
		<PreviewFrame title={body.heading}>
			<p className="text-muted-foreground">{body.passage}</p>
			<Writing ariaLabel="Note" document={body.note} />
			{body.relatedVariant ? (
				<p className="text-muted-foreground text-xs">
					See the variant: {body.relatedVariant.label}
				</p>
			) : null}
		</PreviewFrame>
	);
}

function TextualVariantPreview({ body }: { body: TextualVariantBody }) {
	return (
		<PreviewFrame title={body.location}>
			<p className="text-muted-foreground">
				{body.passage}
				{body.kind ? ` · ${variantKindLabels[body.kind]}` : ""}
				{body.confidence
					? ` · ${variantConfidenceLabels[body.confidence]}`
					: ""}
			</p>
			<ul className="space-y-2">
				{body.readings.map((reading) => (
					<li
						className="rounded-xl border border-border-subtle p-3"
						key={reading.key}
					>
						<p
							className="flex flex-wrap items-center gap-2 font-serif text-lg"
							lang="grc"
						>
							{reading.text || "Reading"}
							{reading.preferred ? (
								<StatusChip tone="success">Preferred</StatusChip>
							) : null}
						</p>
						{reading.gloss ? <p>{reading.gloss}</p> : null}
						{reading.witnesses.length > 0 ? (
							<p className="text-muted-foreground text-xs">
								{reading.witnesses.join(", ")}
							</p>
						) : null}
					</li>
				))}
			</ul>
			<Writing
				ariaLabel="Why this reading is preferred"
				document={body.reason}
			/>
		</PreviewFrame>
	);
}

function CrossReferencePreview({
	body,
	title,
}: {
	body: CrossReferenceBody;
	title: string;
}) {
	return (
		<PreviewFrame title={title}>
			<p className="text-muted-foreground">
				{body.kind ? crossReferenceKindLabels[body.kind] : ""}
				{body.twoWay ? " · Shown on both passages" : ""}
			</p>
			<p>{body.note}</p>
		</PreviewFrame>
	);
}

function CanonicalRelationshipPreview({
	body,
	title,
}: {
	body: CanonicalRelationshipBody;
	title: string;
}) {
	return (
		<PreviewFrame title={title}>
			<p className="text-muted-foreground">
				{body.relationship
					? canonicalRelationshipLabels[body.relationship]
					: ""}
				{body.textForm ? ` · ${textFormLabels[body.textForm]}` : ""}
			</p>
			<p>{body.note}</p>
		</PreviewFrame>
	);
}

export type StudyPreviewInput =
	| { kind: "cross_reference"; body: CrossReferenceBody }
	| { kind: "canonical_relationship"; body: CanonicalRelationshipBody }
	| { kind: "interpretive_question"; body: QuestionBody }
	| { kind: "theme"; body: ThemeBody }
	| { kind: "original_language_note"; body: OriginalLanguageNoteBody }
	| { kind: "textual_note"; body: TextualNoteBody }
	| { kind: "textual_variant"; body: TextualVariantBody };

/** Reads a study record's body for its preview. Null for every other kind. */
export function studyPreviewInput(
	kind: string,
	body: unknown,
): StudyPreviewInput | null {
	switch (kind) {
		case "cross_reference":
			return { body: crossReferenceBodySchema.parse(body), kind };
		case "canonical_relationship":
			return { body: canonicalRelationshipBodySchema.parse(body), kind };
		case "interpretive_question":
			return { body: questionBodySchema.parse(body), kind };
		case "theme":
			return { body: themeBodySchema.parse(body), kind };
		case "original_language_note":
			return { body: originalLanguageNoteBodySchema.parse(body), kind };
		case "textual_note":
			return { body: textualNoteBodySchema.parse(body), kind };
		case "textual_variant":
			return { body: textualVariantBodySchema.parse(body), kind };
		default:
			return null;
	}
}

/** Any study record as readers will see it. */
export function StudyPreview({
	input,
	title,
}: {
	input: StudyPreviewInput;
	title: string;
}) {
	switch (input.kind) {
		case "cross_reference":
			return <CrossReferencePreview body={input.body} title={title} />;
		case "canonical_relationship":
			return <CanonicalRelationshipPreview body={input.body} title={title} />;
		case "interpretive_question":
			return <QuestionPreview body={input.body} title={title} />;
		case "theme":
			return <ThemePreview body={input.body} />;
		case "original_language_note":
			return <OriginalLanguageNotePreview body={input.body} />;
		case "textual_note":
			return <TextualNotePreview body={input.body} />;
		case "textual_variant":
			return <TextualVariantPreview body={input.body} />;
	}
}
