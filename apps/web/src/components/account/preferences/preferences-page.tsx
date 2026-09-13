import { Button } from "@berean-study/ui/components/button";
import { CheckIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useFormDraft } from "../../form-drafts";
import { DisplayPreferences } from "./display-preferences";
import {
	applyDisplaySettings,
	defaultDisplaySettings,
	readDisplaySettings,
	saveDisplaySettings,
} from "./display-settings";
import { PreferencesSidebar } from "./preferences-sidebar";
import { ScripturePreferences } from "./scripture-preferences";
import type { ReadingWidth, TextSize, Theme } from "./types";

export function PreferencesPage() {
	const [tradition, setTradition] = useFormDraft(
		"account.preferences.tradition",
		"protestant",
	);
	const [translation, setTranslation] = useFormDraft(
		"account.preferences.translation",
		"English Standard Version (ESV)",
	);
	const [theme, setTheme] = useState<Theme>(defaultDisplaySettings.theme);
	const [textSize, setTextSize] = useState<TextSize>(
		defaultDisplaySettings.textSize,
	);
	const [readingWidth, setReadingWidth] = useState<ReadingWidth>(
		defaultDisplaySettings.readingWidth,
	);
	const [hasLoadedDisplaySettings, setHasLoadedDisplaySettings] =
		useState(false);

	useEffect(() => {
		const settings = readDisplaySettings();
		setTheme(settings.theme);
		setTextSize(settings.textSize);
		setReadingWidth(settings.readingWidth);
		setHasLoadedDisplaySettings(true);
	}, []);

	useEffect(() => {
		if (!hasLoadedDisplaySettings) return;

		const settings = { theme, textSize, readingWidth };
		applyDisplaySettings(settings);
		saveDisplaySettings(settings);
	}, [hasLoadedDisplaySettings, readingWidth, textSize, theme]);

	return (
		<div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
			<main className="flex min-w-0 flex-col gap-5">
				<ScripturePreferences
					onTraditionChange={setTradition}
					onTranslationChange={setTranslation}
					tradition={tradition}
					translation={translation}
				/>
				<DisplayPreferences
					onReadingWidthChange={setReadingWidth}
					onTextSizeChange={setTextSize}
					onThemeChange={setTheme}
					readingWidth={readingWidth}
					textSize={textSize}
					theme={theme}
				/>
				<div className="flex flex-col items-end gap-2 border-border/60 border-t pt-4">
					<Button
						className="h-10 rounded-lg px-5 font-medium"
						onClick={() => toast.success("Preferences saved.")}
					>
						<CheckIcon aria-hidden="true" data-icon="inline-start" />
						Save preferences
					</Button>
				</div>
			</main>
			<PreferencesSidebar />
		</div>
	);
}
