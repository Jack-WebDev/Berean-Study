import { Button } from "@berean-study/ui/components/button";
import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DisplayPreferences } from "./display-preferences";
import { PreferencesSidebar } from "./preferences-sidebar";
import { ScripturePreferences } from "./scripture-preferences";
import type {
	ReadingWidth,
	TextSize,
	Theme,
	Tradition,
	Translation,
} from "./types";

export function PreferencesPage() {
	const [tradition, setTradition] = useState<Tradition>("protestant");
	const [translation, setTranslation] = useState<Translation>(
		"English Standard Version (ESV)",
	);
	const [theme, setTheme] = useState<Theme>("light");
	const [textSize, setTextSize] = useState<TextSize>("default");
	const [readingWidth, setReadingWidth] = useState<ReadingWidth>("default");

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
