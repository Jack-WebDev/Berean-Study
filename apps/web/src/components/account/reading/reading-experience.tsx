import { BookOpenIcon } from "lucide-react";

import {
	BooleanReadingSetting,
	ReadingSettingsPanel,
	ReadingSettingsRow,
	ReadingSettingToggle,
} from "./reading-settings-panel";
import type { ReadingSettings } from "./types";

const defaultViewOptions = [
	{ label: "Single", value: "single" },
	{ label: "Parallel", value: "parallel" },
	{ label: "Study", value: "study" },
] as const;
const passageLayoutOptions = [
	{ label: "Continuous", value: "continuous" },
	{ label: "Verse by verse", value: "verse" },
] as const;

export function ReadingExperience({
	settings,
	onSettingsChange,
}: {
	settings: ReadingSettings;
	onSettingsChange: (changes: Partial<ReadingSettings>) => void;
}) {
	return (
		<ReadingSettingsPanel
			description="Choose how Berean Study behaves when you read."
			icon={BookOpenIcon}
			title="Reading Experience"
		>
			<ReadingSettingsRow
				description="Choose which view to open by default when reading a passage."
				label="Default view"
			>
				<ReadingSettingToggle
					onValueChange={(defaultView) => onSettingsChange({ defaultView })}
					options={defaultViewOptions}
					value={settings.defaultView}
				/>
			</ReadingSettingsRow>
			<ReadingSettingsRow
				description="Choose how the content is arranged on the page."
				label="Default passage layout"
			>
				<ReadingSettingToggle
					onValueChange={(passageLayout) => onSettingsChange({ passageLayout })}
					options={passageLayoutOptions}
					value={settings.passageLayout}
				/>
			</ReadingSettingsRow>
			<BooleanReadingSetting
				checked={settings.showVerseNumbers}
				description="Display verse numbers in the text."
				label="Show verse numbers"
				onCheckedChange={(showVerseNumbers) =>
					onSettingsChange({ showVerseNumbers })
				}
			/>
			<BooleanReadingSetting
				checked={settings.showSectionHeadings}
				description="Display chapter and section headings."
				label="Show section headings"
				onCheckedChange={(showSectionHeadings) =>
					onSettingsChange({ showSectionHeadings })
				}
			/>
			<BooleanReadingSetting
				checked={settings.redLetterText}
				description="Show the words of Jesus in red (where available)."
				label="Red letter text"
				onCheckedChange={(redLetterText) => onSettingsChange({ redLetterText })}
			/>
			<BooleanReadingSetting
				checked={settings.footnotes}
				description="Show footnotes and cross-references in the text."
				label="Footnotes and cross-references"
				onCheckedChange={(footnotes) => onSettingsChange({ footnotes })}
			/>
		</ReadingSettingsPanel>
	);
}
