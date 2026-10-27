import {
	emptyRichTextDocument,
	hasRichTextContent,
	type RichTextDocument,
} from "@berean-study/rich-text-editor/document";
import { useQuery } from "@tanstack/react-query";

import { createReflection, updateReflection } from "@/functions/reflections";
import { prayerQueryOptions } from "@/queries/prayers";
import { reflectionQueryOptions } from "@/queries/reflections";
import { formatFullDate } from "@/utils/dates";
import {
	documentClassName,
	EntryEditorLayout,
	LoadingEntry,
	MissingEntry,
	pageEditorClassName,
} from "./entry-editor-layout";
import { guidingQuestions } from "./journal-copy";
import { JournalEditor } from "./journal-editor";
import {
	PrayerPanelAside,
	PrayerPanelSheet,
	PrayerPanelToggle,
	usePrayerPanel,
} from "./reflection-prayer-panel";
import { useEntryEditor } from "./use-entry-editor";

type ReflectionValues = {
	content: RichTextDocument;
	prayerId: number | null;
	/**
	 * The question shown as the faded prompt. It's saved beside the reflection
	 * (the timeline shows it) but never inserted into the writing.
	 */
	prompt: string | null;
};

const freeReflectionPrompt = "What do you notice as you look back?";

export function ReflectionEditorPage({
	prayerId,
	prompt,
	reflectionId,
}: {
	prayerId?: number;
	prompt?: string;
	reflectionId?: number;
}) {
	const reflection = useQuery({
		...reflectionQueryOptions(reflectionId ?? 0),
		enabled: Boolean(reflectionId),
	});
	if (!reflectionId)
		return (
			<ReflectionEditor
				initial={{
					content: emptyRichTextDocument,
					prayerId: prayerId ?? null,
					// Looking back on a prayer starts from the first guiding question;
					// a free reflection only gets a prompt if one was chosen.
					prompt: prompt ?? (prayerId ? guidingQuestions[0] : null),
				}}
			/>
		);
	if (reflection.isError || reflection.data === null)
		return <MissingEntry kind="reflection" />;
	if (!reflection.data) return <LoadingEntry />;
	return (
		<ReflectionEditor
			createdAt={reflection.data.createdAt}
			initial={{
				content: reflection.data.content,
				prayerId: reflection.data.prayer?.id ?? null,
				prompt: reflection.data.prompt,
			}}
			reflectionId={reflection.data.id}
		/>
	);
}

function ReflectionEditor({
	createdAt,
	initial,
	reflectionId,
}: {
	createdAt?: Date;
	initial: ReflectionValues;
	reflectionId?: number;
}) {
	// A free reflection has no prayer, so it gets no panel and no toggle.
	const prayer = useQuery({
		...prayerQueryOptions(initial.prayerId ?? 0),
		enabled: Boolean(initial.prayerId),
	}).data;
	const panel = usePrayerPanel();
	const entry = useEntryEditor<ReflectionValues>({
		canSave: (values) => hasRichTextContent(values.content),
		create: async (values) => {
			const created = await createReflection({ data: values });
			if (!created) throw new Error("Unable to save reflection.");
			return created.id;
		},
		existingId: reflectionId,
		initial,
		update: (id, values) => updateReflection({ data: { ...values, id } }),
	});
	const { setValues, values } = entry;

	return (
		<EntryEditorLayout
			aside={
				prayer && panel.isWide && panel.open ? (
					<PrayerPanelAside prayer={prayer} />
				) : null
			}
			doneSearch={values.prayerId ? { prayer: values.prayerId } : {}}
			entry={entry}
			incompleteMessage="Write something to save"
			kind="reflection"
			meta={`Reflection · ${formatFullDate(createdAt ?? new Date())}`}
			topBarActions={
				prayer ? (
					<PrayerPanelToggle onToggle={panel.toggle} open={panel.open} />
				) : null
			}
		>
			<JournalEditor
				ariaLabel="Reflection"
				className={pageEditorClassName}
				contentClassName={documentClassName}
				onChange={(content) =>
					setValues((current) => ({ ...current, content }))
				}
				placeholder={values.prompt ?? freeReflectionPrompt}
				toolbar="docked"
				value={values.content}
			/>
			{prayer && !panel.isWide ? (
				<PrayerPanelSheet
					onOpenChange={panel.setSheetOpen}
					open={panel.open}
					prayer={prayer}
				/>
			) : null}
		</EntryEditorLayout>
	);
}
