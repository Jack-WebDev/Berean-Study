import {
	defaultNotificationPreferences,
	type NotificationPreferenceKey,
	type NotificationPreferences,
	type NotificationTopicPreferenceKey,
} from "@berean-study/db/notification-preferences";
import { Button } from "@berean-study/ui/components/button";
import { Separator } from "@berean-study/ui/components/separator";
import { Switch } from "@berean-study/ui/components/switch";
import type { LucideIcon } from "lucide-react";
import {
	BellRingIcon,
	BookmarkIcon,
	BookOpenIcon,
	Clock3Icon,
	FileTextIcon,
	HeartIcon,
	MailIcon,
	MegaphoneIcon,
	MonitorSmartphoneIcon,
	NewspaperIcon,
	PencilLineIcon,
	Settings2Icon,
	ShieldCheckIcon,
	UsersRoundIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
	getNotificationPreferences,
	updateNotificationPreferences,
} from "@/functions/notification-preferences";

type QuietHours = {
	enabled: boolean;
	end: string;
	start: string;
	timezone: string;
};

type NotificationTopic = {
	description: string;
	icon: LucideIcon;
	id: NotificationTopicPreferenceKey;
	label: string;
};

const notificationTopics = [
	{
		description:
			"Important updates about your account, security, and sign-ins.",
		icon: ShieldCheckIcon,
		id: "security",
		label: "Account & security",
	},
	{
		description:
			"Gentle reminders to help you stay consistent in your reading.",
		icon: BookOpenIcon,
		id: "resources",
		label: "Reading reminders",
	},
	{
		description: "Friendly reminders to pause and reflect in prayer.",
		icon: HeartIcon,
		id: "replies",
		label: "Prayer reflection reminders",
	},
	{
		description: "Notifications about content you’ve saved, including updates.",
		icon: BookmarkIcon,
		id: "updates",
		label: "Saved content updates",
	},
	{
		description:
			"Updates about replies, mentions, and activity from people you follow.",
		icon: UsersRoundIcon,
		id: "comments",
		label: "Community activity",
	},
	{
		description:
			"Be notified when new study resources, guides, or content are released.",
		icon: NewspaperIcon,
		id: "account",
		label: "New study resources",
	},
	{
		description: "Updates about activity on your notes and collections.",
		icon: PencilLineIcon,
		id: "mentions",
		label: "Notes & collections activity",
	},
	{
		description:
			"Product updates, new features, and important news from Berean Study.",
		icon: MegaphoneIcon,
		id: "reports",
		label: "Feature announcements",
	},
] as const satisfies readonly NotificationTopic[];

const defaultQuietHours: QuietHours = {
	enabled: true,
	end: "07:00",
	start: "22:00",
	timezone: "Eastern Time (US & Canada)",
};

export function NotificationsPage() {
	const [settings, setSettings] = useState<NotificationPreferences>(
		defaultNotificationPreferences,
	);
	const [quietHours, setQuietHours] = useState<QuietHours>(defaultQuietHours);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		let active = true;

		void getNotificationPreferences()
			.then((preferences) => {
				if (active) setSettings(preferences);
			})
			.catch(() => {
				if (active) toast.error("Unable to load notification settings.");
			})
			.finally(() => {
				if (active) setIsLoading(false);
			});

		return () => {
			active = false;
		};
	}, []);

	function updateSetting(key: NotificationPreferenceKey, checked: boolean) {
		setSettings((current) => ({ ...current, [key]: checked }));
	}

	function updateEmailTopic(
		key: NotificationTopicPreferenceKey,
		checked: boolean,
	) {
		setSettings((current) => ({
			...current,
			emailTopics: { ...current.emailTopics, [key]: checked },
		}));
	}

	function resetPreferences() {
		setSettings(defaultNotificationPreferences);
		setQuietHours(defaultQuietHours);
	}

	async function savePreferences() {
		if (isSaving || isLoading) return;
		setIsSaving(true);

		try {
			await updateNotificationPreferences({ data: settings });
			toast.success("Notification preferences saved.");
		} catch {
			toast.error("Unable to save notification preferences.");
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<div className="w-full max-w-[920px] space-y-3">
			<DeliveryPreferences
				disabled={isLoading || isSaving}
				onChange={updateSetting}
				settings={settings}
			/>
			<NotificationTopics
				disabled={isLoading || isSaving}
				onEmailChange={updateEmailTopic}
				onChange={updateSetting}
				settings={settings}
			/>
			<QuietHoursPanel
				disabled={isLoading || isSaving}
				onChange={setQuietHours}
				quietHours={quietHours}
			/>
			<div className="flex justify-end gap-2 pt-1">
				<Button
					className="h-8 rounded-lg border-[#e4e2dc] bg-white px-3 text-[#466078] text-[11px] shadow-[0_1px_2px_rgba(24,50,79,0.035)] hover:bg-[#fbfcfc]"
					disabled={isSaving}
					onClick={resetPreferences}
					type="button"
					variant="outline"
				>
					Reset to default
				</Button>
				<Button
					className="h-8 rounded-lg bg-[#c7963f] px-4 text-[11px] text-white shadow-[0_2px_4px_rgba(154,110,37,0.18)] hover:bg-[#b88937]"
					disabled={isLoading || isSaving}
					onClick={savePreferences}
					type="button"
				>
					{isSaving ? "Saving…" : "Save preferences"}
				</Button>
			</div>
		</div>
	);
}

function DeliveryPreferences({
	disabled,
	onChange,
	settings,
}: {
	disabled: boolean;
	onChange: (key: NotificationPreferenceKey, checked: boolean) => void;
	settings: NotificationPreferences;
}) {
	return (
		<section className="overflow-hidden rounded-[10px] border border-[#e7e5e1] bg-white shadow-[0_3px_12px_rgba(24,50,79,0.04)] dark:border-border dark:bg-card dark:shadow-none">
			<PanelHeader
				description="Choose how you want to receive notifications across your devices."
				icon={BellRingIcon}
				title="Delivery preferences"
			/>
			<Separator className="mx-4 bg-[#e8e6e1] dark:bg-border" />
			<div className="grid divide-y divide-[#eceae6] sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-border">
				<DeliveryOption
					checked={settings.push}
					description="Show notifications in the app while you’re using Berean Study."
					disabled={disabled}
					icon={MonitorSmartphoneIcon}
					label="In-app notifications"
					onCheckedChange={(checked) => onChange("push", checked)}
				/>
				<DeliveryOption
					checked={settings.email}
					description="Send notifications to your email address."
					disabled={disabled}
					icon={MailIcon}
					label="Email notifications"
					onCheckedChange={(checked) => onChange("email", checked)}
				/>
				<DeliveryOption
					checked={settings.updates}
					description="Receive a daily summary of non-urgent activity by email."
					disabled={disabled}
					icon={FileTextIcon}
					label="Daily digest"
					onCheckedChange={(checked) => onChange("updates", checked)}
				/>
			</div>
		</section>
	);
}

function DeliveryOption({
	checked,
	description,
	disabled,
	icon: Icon,
	label,
	onCheckedChange,
}: {
	checked: boolean;
	description: string;
	disabled: boolean;
	icon: LucideIcon;
	label: string;
	onCheckedChange: (checked: boolean) => void;
}) {
	return (
		<div className="flex min-h-[61px] items-start gap-3 px-4 py-3 sm:px-5">
			<Icon
				aria-hidden="true"
				className="mt-0.5 size-4 shrink-0 text-[#314d68] dark:text-foreground"
				strokeWidth={1.75}
			/>
			<span className="min-w-0 flex-1">
				<span className="block font-semibold text-[#28445f] text-[10.5px] dark:text-foreground">
					{label}
				</span>
				<span className="mt-0.5 block text-[#73849a] text-[9.5px] leading-[1.35] dark:text-muted-foreground">
					{description}
				</span>
			</span>
			<NotificationSwitch
				ariaLabel={label}
				checked={checked}
				disabled={disabled}
				onCheckedChange={onCheckedChange}
			/>
		</div>
	);
}

function NotificationTopics({
	disabled,
	onChange,
	onEmailChange,
	settings,
}: {
	disabled: boolean;
	onChange: (key: NotificationPreferenceKey, checked: boolean) => void;
	onEmailChange: (
		key: NotificationTopicPreferenceKey,
		checked: boolean,
	) => void;
	settings: NotificationPreferences;
}) {
	return (
		<section className="overflow-hidden rounded-[10px] border border-[#e7e5e1] bg-white shadow-[0_3px_12px_rgba(24,50,79,0.04)] dark:border-border dark:bg-card dark:shadow-none">
			<PanelHeader
				description="Select the topics you’d like to be notified about, and choose how you want to receive each type."
				icon={Settings2Icon}
				title="What you want to hear about"
			/>
			<div className="grid grid-cols-[minmax(0,1fr)_70px_70px] border-[#e8e6e1] border-y bg-[#faf9f6] px-4 py-1.5 text-[#65798e] text-[9px] sm:grid-cols-[minmax(0,1fr)_82px_82px] dark:border-border dark:bg-muted/30 dark:text-muted-foreground">
				<span>Notification type</span>
				<span className="text-center">In-app</span>
				<span className="text-center">Email</span>
			</div>
			<div className="divide-y divide-[#ebe9e5] dark:divide-border">
				{notificationTopics.map((topic) => (
					<NotificationTopicRow
						checked={settings[topic.id]}
						disabled={disabled}
						emailChecked={settings.emailTopics[topic.id]}
						key={topic.id}
						onCheckedChange={(checked) => onChange(topic.id, checked)}
						onEmailCheckedChange={(checked) => onEmailChange(topic.id, checked)}
						topic={topic}
					/>
				))}
			</div>
		</section>
	);
}

function NotificationTopicRow({
	checked,
	disabled,
	emailChecked,
	onCheckedChange,
	onEmailCheckedChange,
	topic,
}: {
	checked: boolean;
	disabled: boolean;
	emailChecked: boolean;
	onCheckedChange: (checked: boolean) => void;
	onEmailCheckedChange: (checked: boolean) => void;
	topic: NotificationTopic;
}) {
	const Icon = topic.icon;
	return (
		<div className="grid min-h-[33px] grid-cols-[minmax(0,1fr)_70px_70px] items-center px-4 py-1.5 sm:grid-cols-[minmax(0,1fr)_82px_82px]">
			<div className="flex min-w-0 items-center gap-3">
				<Icon
					aria-hidden="true"
					className="size-4 shrink-0 text-[#36516b] dark:text-foreground"
					strokeWidth={1.7}
				/>
				<div className="min-w-0">
					<p className="truncate font-semibold text-[#2b4761] text-[10px] dark:text-foreground">
						{topic.label}
					</p>
					<p className="hidden truncate text-[#7a8a9d] text-[9px] lg:block dark:text-muted-foreground">
						{topic.description}
					</p>
				</div>
			</div>
			<div className="flex justify-center">
				<NotificationSwitch
					ariaLabel={`In-app ${topic.label}`}
					checked={checked}
					disabled={disabled}
					onCheckedChange={onCheckedChange}
				/>
			</div>
			<div className="flex justify-center">
				<NotificationSwitch
					ariaLabel={`Email ${topic.label}`}
					checked={emailChecked}
					disabled={disabled}
					onCheckedChange={onEmailCheckedChange}
				/>
			</div>
		</div>
	);
}

function QuietHoursPanel({
	disabled,
	onChange,
	quietHours,
}: {
	disabled: boolean;
	onChange: (quietHours: QuietHours) => void;
	quietHours: QuietHours;
}) {
	return (
		<section className="overflow-hidden rounded-[10px] border border-[#e7e5e1] bg-white shadow-[0_3px_12px_rgba(24,50,79,0.04)] dark:border-border dark:bg-card dark:shadow-none">
			<div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
				<div className="flex items-center gap-3">
					<div className="grid size-8 place-items-center rounded-full bg-[#f8f0df] text-[#5a6270] dark:bg-muted">
						<Clock3Icon
							aria-hidden="true"
							className="size-4"
							strokeWidth={1.7}
						/>
					</div>
					<div>
						<h2 className="font-bold font-serif text-[#1f3d5d] text-[17px] tracking-[-0.02em] dark:text-foreground">
							Quiet hours
						</h2>
						<p className="text-[#72849a] text-[9.5px] dark:text-muted-foreground">
							Pause non-essential notifications during specific hours.
						</p>
					</div>
				</div>
				<div className="flex items-center gap-3 sm:max-w-[310px]">
					<span className="min-w-0 flex-1 text-right">
						<span className="block font-semibold text-[#526980] text-[9.5px] dark:text-foreground">
							Pause non-essential notifications
						</span>
						<span className="block text-[#7b8b9d] text-[8.5px] dark:text-muted-foreground">
							You’ll still receive critical account and security notifications.
						</span>
					</span>
					<NotificationSwitch
						ariaLabel="Pause non-essential notifications"
						checked={quietHours.enabled}
						disabled={disabled}
						onCheckedChange={(enabled) => onChange({ ...quietHours, enabled })}
					/>
				</div>
			</div>
			<Separator className="bg-[#e8e6e1] dark:bg-border" />
			<div className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_205px_minmax(0,1fr)] sm:items-center sm:px-5">
				<div>
					<p className="font-semibold text-[#405a73] text-[9.5px] dark:text-foreground">
						Quiet hours
					</p>
					<p className="mt-0.5 max-w-[220px] text-[#798a9d] text-[9px] leading-[1.3] dark:text-muted-foreground">
						Set a time range when non-essential notifications are paused.
					</p>
				</div>
				<div className="flex items-center gap-1.5">
					<TimeSelect
						disabled={disabled || !quietHours.enabled}
						label="Quiet hours start"
						onChange={(start) => onChange({ ...quietHours, start })}
						value={quietHours.start}
					/>
					<span className="text-[#8090a0] text-[10px]">–</span>
					<TimeSelect
						disabled={disabled || !quietHours.enabled}
						label="Quiet hours end"
						onChange={(end) => onChange({ ...quietHours, end })}
						value={quietHours.end}
					/>
				</div>
				<label className="border-[#e8e6e1] border-t pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
					<span className="block font-semibold text-[#405a73] text-[9.5px] dark:text-foreground">
						Timezone
					</span>
					<span className="mb-1 block text-[#798a9d] text-[8.5px] dark:text-muted-foreground">
						Quiet hours use your current timezone.
					</span>
					<select
						aria-label="Quiet hours timezone"
						className="h-7 w-full rounded-md border border-[#e5e7e8] bg-white px-2 text-[#4c6178] text-[9px] outline-none focus:border-[#9cb0c3] focus:ring-2 focus:ring-[#a9bdce]/25 disabled:cursor-not-allowed disabled:opacity-50 dark:border-border dark:bg-card dark:text-foreground"
						disabled={disabled || !quietHours.enabled}
						onChange={(event) =>
							onChange({ ...quietHours, timezone: event.target.value })
						}
						value={quietHours.timezone}
					>
						<option>Eastern Time (US & Canada)</option>
						<option>Central European Time</option>
						<option>South Africa Standard Time</option>
					</select>
				</label>
			</div>
		</section>
	);
}

function TimeSelect({
	disabled,
	label,
	onChange,
	value,
}: {
	disabled: boolean;
	label: string;
	onChange: (time: string) => void;
	value: string;
}) {
	return (
		<select
			aria-label={label}
			className="h-7 min-w-0 flex-1 rounded-md border border-[#e5e7e8] bg-white px-2 text-[#4c6178] text-[9px] outline-none focus:border-[#9cb0c3] focus:ring-2 focus:ring-[#a9bdce]/25 disabled:cursor-not-allowed disabled:opacity-50 dark:border-border dark:bg-card dark:text-foreground"
			disabled={disabled}
			onChange={(event) => onChange(event.target.value)}
			value={value}
		>
			<option value="22:00">10:00 PM</option>
			<option value="21:00">9:00 PM</option>
			<option value="23:00">11:00 PM</option>
			<option value="07:00">7:00 AM</option>
			<option value="08:00">8:00 AM</option>
		</select>
	);
}

function PanelHeader({
	description,
	icon: Icon,
	title,
}: {
	description: string;
	icon: LucideIcon;
	title: string;
}) {
	return (
		<header className="flex items-center gap-3 px-4 py-3 sm:px-5">
			<div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f8f0df] text-[#5c6671] dark:bg-muted dark:text-foreground">
				<Icon aria-hidden="true" className="size-4" strokeWidth={1.7} />
			</div>
			<div>
				<h2 className="font-bold font-serif text-[#1f3d5d] text-[17px] leading-5 tracking-[-0.02em] dark:text-foreground">
					{title}
				</h2>
				<p className="mt-0.5 text-[#72849a] text-[9.5px] leading-[1.35] dark:text-muted-foreground">
					{description}
				</p>
			</div>
		</header>
	);
}

function NotificationSwitch({
	ariaLabel,
	checked,
	disabled,
	onCheckedChange,
}: {
	ariaLabel: string;
	checked: boolean;
	disabled: boolean;
	onCheckedChange: (checked: boolean) => void;
}) {
	return (
		<Switch
			aria-label={ariaLabel}
			checked={checked}
			className="data-checked:bg-[#c7963f] data-unchecked:bg-[#dfe2e5]"
			disabled={disabled}
			onCheckedChange={onCheckedChange}
		/>
	);
}
