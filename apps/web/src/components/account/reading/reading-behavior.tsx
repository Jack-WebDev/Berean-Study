import { Clock3Icon } from "lucide-react";

import {
	BooleanReadingSetting,
	ReadingSettingsPanel,
	ReadingSettingsRow,
	ReadingSettingToggle,
} from "./reading-settings-panel";
import type { ReadingSettings } from "./types";

const scrollingOptions = [
	{ label: "Smooth", value: "smooth" },
	{ label: "Instant", value: "instant" },
] as const;

export function ReadingBehavior({
	settings,
	onSettingsChange,
}: {
	settings: ReadingSettings;
	onSettingsChange: (changes: Partial<ReadingSettings>) => void;
}) {
	return (
		<ReadingSettingsPanel
			description="Customize what happens as you read."
			icon={Clock3Icon}
			title="Reading Behavior"
		>
			<BooleanReadingSetting
				checked={settings.rememberPosition}
				description="Automatically return to where you left off."
				label="Remember last position"
				onCheckedChange={(rememberPosition) =>
					onSettingsChange({ rememberPosition })
				}
			/>
			<ReadingSettingsRow
				description="Choose how the page scrolls when navigating between verses."
				label="Scrolling behavior"
			>
				<ReadingSettingToggle
					onValueChange={(scrolling) => onSettingsChange({ scrolling })}
					options={scrollingOptions}
					value={settings.scrolling}
				/>
			</ReadingSettingsRow>
		</ReadingSettingsPanel>
	);
}
