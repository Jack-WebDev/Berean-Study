import { useFormDraft } from "../../form-drafts";
import { ReadingBehavior } from "./reading-behavior";
import { ReadingExperience } from "./reading-experience";
import { ReadingSidebar } from "./reading-sidebar";
import { initialReadingSettings, type ReadingSettings } from "./types";

export function ReadingPage() {
	const [settings, setSettings] = useFormDraft(
		"account.reading.settings",
		initialReadingSettings,
	);

	function updateSettings(changes: Partial<ReadingSettings>) {
		setSettings((current) => ({ ...current, ...changes }));
	}

	return (
		<div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
			<main className="flex min-w-0 flex-col gap-5">
				<ReadingExperience
					onSettingsChange={updateSettings}
					settings={settings}
				/>
				<ReadingBehavior
					onSettingsChange={updateSettings}
					settings={settings}
				/>
			</main>
			<ReadingSidebar />
		</div>
	);
}
