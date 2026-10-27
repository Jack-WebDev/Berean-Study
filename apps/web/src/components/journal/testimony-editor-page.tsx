import type { Testimony } from "@berean-study/db/testimonies";
import { hasRichTextContent } from "@berean-study/rich-text-editor/document";
import { cn } from "@berean-study/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";

import { useFormDraft } from "@/components/form-drafts";
import { createTestimony, updateTestimony } from "@/functions/testimonies";
import { testimonyQueryOptions } from "@/queries/testimonies";
import { formatFullDate, fromMonthInput, toMonthInput } from "@/utils/dates";
import {
	documentClassName,
	EntryEditorLayout,
	LoadingEntry,
	MissingEntry,
	pageEditorClassName,
	SettingsAside,
	TitleInput,
} from "./entry-editor-layout";
import {
	createEmptyTestimonyDraft,
	type TestimonyDraft,
	testimonyPrompt,
} from "./journal-drafts";
import { JournalEditor } from "./journal-editor";
import { fieldClassName } from "./journal-ui";
import { useShareTestimony } from "./testimony-sharing";
import { useEntryEditor } from "./use-entry-editor";

export function TestimonyEditorPage({ testimonyId }: { testimonyId?: number }) {
	const testimony = useQuery({
		...testimonyQueryOptions(testimonyId ?? 0),
		enabled: Boolean(testimonyId),
	});
	if (!testimonyId) return <TestimonyEditor />;
	if (testimony.isError || testimony.data === null)
		return <MissingEntry kind="testimony" />;
	if (!testimony.data) return <LoadingEntry />;
	return <TestimonyEditor testimony={testimony.data} />;
}

function TestimonyEditor({ testimony }: { testimony?: Testimony }) {
	const [draft, setDraft] = useFormDraft(
		"journal.testimony.new",
		createEmptyTestimonyDraft(),
	);
	const share = useShareTestimony();
	const [shared, setShared] = useState(testimony?.sharedToCommunity ?? false);
	const initial: TestimonyDraft = testimony
		? {
				content: testimony.content,
				happenedMonth: toMonthInput(testimony.happenedOn),
				share: testimony.sharedToCommunity,
				title: testimony.title,
			}
		: draft;
	const save = (values: TestimonyDraft) => ({
		content: values.content,
		happenedOn: fromMonthInput(values.happenedMonth),
		title: values.title.trim(),
	});
	const entry = useEntryEditor({
		canSave: (values) =>
			Boolean(values.title.trim()) && hasRichTextContent(values.content),
		create: async (values) =>
			(await createTestimony({ data: save(values) })).id,
		existingId: testimony?.id,
		initial,
		onDraftChange: (values) => setDraft(values ?? createEmptyTestimonyDraft()),
		update: (id, values) => updateTestimony({ data: { ...save(values), id } }),
	});
	const { setValues, values } = entry;
	const visibilityName = useId();

	// Sharing posts to Community once the testimony exists.
	useEffect(() => {
		if (!values.share || shared || !entry.savedId || share.isPending) return;
		setShared(true);
		share.mutate({
			content: values.content,
			id: entry.savedId,
			title: values.title,
		});
	}, [
		entry.savedId,
		share,
		shared,
		values.content,
		values.share,
		values.title,
	]);

	return (
		<EntryEditorLayout
			doneSearch={entry.savedId ? { testimony: entry.savedId } : {}}
			entry={entry}
			incompleteMessage="Add a title and your story to save"
			kind="testimony"
			meta={`Testimony · ${formatFullDate(testimony?.createdAt ?? new Date())}`}
			aside={
				<SettingsAside>
					<fieldset className="flex flex-col gap-2">
						<legend className="mb-2 font-semibold text-[13px] text-foreground/80">
							Who can see this
						</legend>
						{[
							{ label: "Only me", share: false },
							{ label: "Share with my community", share: true },
						].map((option) => (
							<label
								className={cn(
									"flex min-h-11 items-center gap-2.5 rounded-[10px] border px-3 text-sm has-disabled:opacity-60",
									values.share === option.share
										? "border-primary"
										: "border-input",
								)}
								key={option.label}
							>
								<input
									checked={values.share === option.share}
									className="accent-primary"
									// There is no way to take a Community post down yet.
									disabled={shared && !option.share}
									name={visibilityName}
									onChange={() =>
										setValues((current) => ({
											...current,
											share: option.share,
										}))
									}
									type="radio"
								/>
								{option.label}
							</label>
						))}
						{shared ? (
							<p className="text-muted-foreground text-xs leading-normal">
								This testimony is shared with your community. Making it private
								again isn’t available yet.
							</p>
						) : values.share ? (
							<p className="text-muted-foreground text-xs leading-normal">
								It will be posted to Community once it’s saved.
							</p>
						) : null}
					</fieldset>
					<label className="flex flex-col gap-2 font-semibold text-[13px] text-foreground/80">
						When did this happen?
						<input
							className={cn(fieldClassName, "font-normal text-sm")}
							onChange={(event) =>
								setValues((current) => ({
									...current,
									happenedMonth: event.target.value,
								}))
							}
							type="month"
							value={values.happenedMonth}
						/>
					</label>
				</SettingsAside>
			}
			title={
				<TitleInput
					onChange={(title) => setValues((current) => ({ ...current, title }))}
					value={values.title}
				/>
			}
		>
			<JournalEditor
				ariaLabel="Testimony"
				className={pageEditorClassName}
				contentClassName={documentClassName}
				onChange={(content) =>
					setValues((current) => ({ ...current, content }))
				}
				placeholder={testimonyPrompt}
				toolbar="docked"
				value={values.content}
			/>
		</EntryEditorLayout>
	);
}
