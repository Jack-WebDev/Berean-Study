import { cn } from "@berean-study/ui/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { proposeVerseHandling } from "@/functions/structure";
import { verseHandlingQueryOptions } from "@/queries/foundations";

import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { ReasonField } from "../staff-form-dialog";
import { StaffPage } from "../staff-page";
import {
	type HandlingAnswer,
	TranslationHandlingFields,
} from "./translation-handling-fields";
import { useFoundationMutation } from "./use-foundation-mutation";

type HandlingData = NonNullable<
	Awaited<
		ReturnType<
			NonNullable<ReturnType<typeof verseHandlingQueryOptions>["queryFn"]>
		>
	>
>;

export function VerseHandlingPage({
	chapter,
	slug,
	verse,
}: {
	chapter: number;
	slug: string;
	verse: number;
}) {
	const { data } = useSuspenseQuery(
		verseHandlingQueryOptions({ chapter, slug, verse }),
	);

	if (!data) {
		return (
			<div className="px-4 py-16 text-center sm:px-8">
				<h1 className="font-serif text-3xl">We can't find this verse</h1>
				<Link
					className={cn(staffLinkClassName, "mt-6")}
					params={{ bookSlug: slug }}
					to="/admin/scripture/$bookSlug/chapters"
				>
					Back to chapters & verses
				</Link>
			</div>
		);
	}

	return (
		<VerseHandlingForm
			chapter={chapter}
			data={data}
			slug={slug}
			verse={verse}
		/>
	);
}

function VerseHandlingForm({
	chapter,
	data,
	slug,
	verse,
}: {
	chapter: number;
	data: HandlingData;
	slug: string;
	verse: number;
}) {
	const [answers, setAnswers] = useState<HandlingAnswer[]>(() =>
		data.rows.map(({ abbreviation, hasText, includedInVerse, kind }) => ({
			abbreviation,
			includedInVerse,
			kind,
			mustKeepOwnVerse: hasText,
		})),
	);
	const [reason, setReason] = useState("");

	const unchanged = answers.every((answer) => {
		const row = data.rows.find(
			({ abbreviation }) => abbreviation === answer.abbreviation,
		);
		return (
			row?.kind === answer.kind &&
			(row.includedInVerse ?? null) === (answer.includedInVerse ?? null)
		);
	});

	const send = useFoundationMutation(() =>
		proposeVerseHandling({
			data: {
				chapter,
				handling: answers.map(({ abbreviation, includedInVerse, kind }) => ({
					abbreviation,
					includedInVerse,
					kind,
				})),
				reason,
				slug,
				verse,
			},
		}),
	);

	return (
		<StaffPage
			actions={
				<Link
					className={staffLinkClassName}
					params={{ bookSlug: slug }}
					search={{ chapter, verse }}
					to="/admin/scripture/$bookSlug/chapters"
				>
					Back to chapter
				</Link>
			}
			description="Say which translations number this verse on its own and which keep it inside another. No verse numbers change."
			section="Split / merge verse"
			title={data.reference}
		>
			<div className="max-w-3xl space-y-6">
				<StaffCard title="How each translation handles it">
					<TranslationHandlingFields
						answers={answers}
						onChange={setAnswers}
						verses={data.otherVerses}
					/>
				</StaffCard>

				<StaffCard title="Send for confirmation">
					<ReasonField
						hint="Shown to the second Superadmin and kept in the audit log."
						onChange={setReason}
						value={reason}
					/>
					{send.data ? (
						<div
							className="mt-3 rounded-[0.625rem] bg-status-info p-3 text-sm text-status-info-foreground"
							role="status"
						>
							<p>Sent. Nothing changes until a second Superadmin confirms.</p>
							<Link
								className="mt-1 inline-block underline underline-offset-2"
								params={{ proposalId: String(send.data) }}
								to="/admin/scripture/changes/$proposalId"
							>
								See this change
							</Link>
						</div>
					) : (
						<StaffButton
							className="mt-3"
							disabled={unchanged || !reason.trim() || send.isPending}
							onClick={() => send.mutate(undefined)}
						>
							Send for confirmation
						</StaffButton>
					)}
				</StaffCard>
			</div>
		</StaffPage>
	);
}
