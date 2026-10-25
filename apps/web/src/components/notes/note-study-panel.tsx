import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@berean-study/ui/components/tabs";
import { useRouteContext } from "@tanstack/react-router";
import { type ReactNode, useCallback, useEffect, useState } from "react";

export type StudyTab = "details" | "outline" | "passage";

const studyTabs: ReadonlyArray<{ label: string; value: StudyTab }> = [
	{ label: "Passage", value: "passage" },
	{ label: "Outline", value: "outline" },
	{ label: "Details", value: "details" },
];

/** The tabbed study card beside the editor. */
export function NoteStudyPanel({
	details,
	onTabChange,
	outline,
	passage,
	tab,
}: {
	details: ReactNode;
	onTabChange: (tab: StudyTab) => void;
	outline: ReactNode;
	passage: ReactNode;
	tab: StudyTab;
}) {
	return (
		<Tabs
			className="gap-0 overflow-hidden rounded-2xl border border-border bg-card"
			onValueChange={(value) => onTabChange(value as StudyTab)}
			value={tab}
		>
			<TabsList
				aria-label="Study panel"
				className="h-auto w-full justify-start gap-1 border-border border-b px-3"
				variant="line"
			>
				{studyTabs.map((studyTab) => (
					<TabsTrigger
						className="h-11.5 flex-none px-2.5 text-sm data-active:font-semibold"
						key={studyTab.value}
						value={studyTab.value}
					>
						{studyTab.label}
					</TabsTrigger>
				))}
			</TabsList>
			<TabsContent className="p-5" value="passage">
				{passage}
			</TabsContent>
			<TabsContent className="p-5" value="outline">
				{outline}
			</TabsContent>
			<TabsContent className="p-5" value="details">
				{details}
			</TabsContent>
		</Tabs>
	);
}

/** Remembers the member's last-used study tab in this browser. */
export function useStudyTab() {
	const { viewer } = useRouteContext({ from: "/_auth" });
	const storageKey = `berean:note-study-tab:${viewer.session.user.id}`;
	const [tab, setTabState] = useState<StudyTab>("passage");
	// Read after mount so server and first client render agree.
	useEffect(() => setTabState(readStoredTab(storageKey)), [storageKey]);
	const setTab = useCallback(
		(nextTab: StudyTab) => {
			setTabState(nextTab);
			try {
				window.localStorage.setItem(storageKey, nextTab);
			} catch {
				// Storage can be unavailable (private mode); the tab still switches.
			}
		},
		[storageKey],
	);
	return [tab, setTab] as const;
}

function readStoredTab(storageKey: string): StudyTab {
	try {
		const stored = window.localStorage.getItem(storageKey);
		return studyTabs.some((studyTab) => studyTab.value === stored)
			? (stored as StudyTab)
			: "passage";
	} catch {
		return "passage";
	}
}
