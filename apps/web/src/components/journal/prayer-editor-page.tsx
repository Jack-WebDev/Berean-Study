import type { PrayerDetail } from "@berean-study/db/prayers";
import { hasRichTextContent } from "@berean-study/rich-text-editor/document";
import { useQuery } from "@tanstack/react-query";

import { useFormDraft } from "@/components/form-drafts";
import { createPrayer, updatePrayer } from "@/functions/prayers";
import { prayerQueryOptions } from "@/queries/prayers";
import { formatFullDate } from "@/utils/dates";
import {
	documentClassName,
	EntryEditorLayout,
	LoadingEntry,
	MissingEntry,
	pageEditorClassName,
	SettingsAside,
	TitleInput,
} from "./entry-editor-layout";
import { emptyPrayerDraft, type PrayerDraft } from "./journal-drafts";
import { JournalEditor } from "./journal-editor";
import { CategoryChips, PrayingForField, toPrayerInput } from "./prayer-fields";
import { useEntryEditor } from "./use-entry-editor";

export function PrayerEditorPage({ prayerId }: { prayerId?: number }) {
	const prayer = useQuery({
		...prayerQueryOptions(prayerId ?? 0),
		enabled: Boolean(prayerId),
	});
	if (!prayerId) return <PrayerEditor />;
	if (prayer.isError || prayer.data === null)
		return <MissingEntry kind="prayer" />;
	if (!prayer.data) return <LoadingEntry />;
	return <PrayerEditor prayer={prayer.data} />;
}

function PrayerEditor({ prayer }: { prayer?: PrayerDetail }) {
	const [draft, setDraft] = useFormDraft(
		"journal.prayer.new",
		emptyPrayerDraft,
	);
	const initial: PrayerDraft = prayer
		? {
				category: prayer.category ?? "",
				content: prayer.content,
				prayingFor: prayer.prayingFor ?? "",
				title: prayer.title,
			}
		: draft;
	const entry = useEntryEditor({
		canSave: (values) =>
			Boolean(values.title.trim()) && hasRichTextContent(values.content),
		create: async (values) =>
			(await createPrayer({ data: toPrayerInput(values) })).id,
		existingId: prayer?.id,
		initial,
		onDraftChange: (values) => setDraft(values ?? emptyPrayerDraft),
		update: (id, values) =>
			updatePrayer({ data: { ...toPrayerInput(values), id } }),
	});
	const { setValues, values } = entry;

	return (
		<EntryEditorLayout
			doneSearch={entry.savedId ? { prayer: entry.savedId } : {}}
			entry={entry}
			incompleteMessage="Add a title and a prayer to save"
			kind="prayer"
			meta={`Prayer · started ${formatFullDate(prayer?.createdAt ?? new Date())}`}
			aside={
				<SettingsAside>
					<CategoryChips
						allowCustom
						compact
						onChange={(category) =>
							setValues((current) => ({ ...current, category }))
						}
						value={values.category}
					/>
					<PrayingForField
						onChange={(prayingFor) =>
							setValues((current) => ({ ...current, prayingFor }))
						}
						value={values.prayingFor}
					/>
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
				ariaLabel="Prayer"
				className={pageEditorClassName}
				contentClassName={documentClassName}
				onChange={(content) =>
					setValues((current) => ({ ...current, content }))
				}
				onPersonNamed={(name) =>
					setValues((current) => ({ ...current, prayingFor: name }))
				}
				placeholder="Lord, I bring before you…"
				toolbar="docked"
				value={values.content}
			/>
		</EntryEditorLayout>
	);
}
