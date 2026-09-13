import { Button } from "@berean-study/ui/components/button";
import { Label } from "@berean-study/ui/components/label";
import {
	RadioGroup,
	RadioGroupItem,
} from "@berean-study/ui/components/radio-group";
import { Separator } from "@berean-study/ui/components/separator";
import { Switch } from "@berean-study/ui/components/switch";
import type { LucideIcon } from "lucide-react";
import {
	ArrowRightIcon,
	AtSignIcon,
	BellIcon,
	BellRingIcon,
	BookMarkedIcon,
	BookOpenIcon,
	CircleHelpIcon,
	Clock3Icon,
	LightbulbIcon,
	MailIcon,
	MessageCircleIcon,
	MessagesSquareIcon,
	RefreshCwIcon,
	ShieldCheckIcon,
	SmartphoneIcon,
} from "lucide-react";
import { useState } from "react";

type Frequency = "all" | "important" | "minimal";

type NotificationSetting = {
	description: string;
	icon: LucideIcon;
	key: string;
	label: string;
};

const notificationGroups: readonly {
	description: string;
	icon: LucideIcon;
	settings: readonly NotificationSetting[];
	title: string;
}[] = [
	{
		description:
			"Manage how and when you receive notifications from Berean Study.",
		icon: BellRingIcon,
		title: "Notification preferences",
		settings: [
			{
				description: "Receive notifications at test@mail.com",
				icon: MailIcon,
				key: "email",
				label: "Email",
			},
			{
				description: "Receive notifications in your browser or on your device",
				icon: SmartphoneIcon,
				key: "push",
				label: "Push notifications",
			},
		],
	},
	{
		description: "Stay informed about new and updated content.",
		icon: BookOpenIcon,
		title: "Content updates",
		settings: [
			{
				description: "Get notified when new commentaries are published.",
				icon: MessagesSquareIcon,
				key: "comments",
				label: "New commentaries",
			},
			{
				description: "Get notified when existing content is updated.",
				icon: RefreshCwIcon,
				key: "updates",
				label: "Updated content",
			},
			{
				description: "Get notified about new articles, study guides, or tools.",
				icon: BookMarkedIcon,
				key: "resources",
				label: "New study resources",
			},
		],
	},
	{
		description: "Notifications about your activity and interactions.",
		icon: MessagesSquareIcon,
		title: "Community and interaction",
		settings: [
			{
				description: "Get notified when someone replies to your comments.",
				icon: MessageCircleIcon,
				key: "replies",
				label: "Replies to your comments",
			},
			{
				description: "Get notified when someone mentions you.",
				icon: AtSignIcon,
				key: "mentions",
				label: "Mentions",
			},
			{
				description:
					"Get notified about the status of content you’ve reported.",
				icon: CircleHelpIcon,
				key: "reports",
				label: "Updates to your reports",
			},
		],
	},
	{
		description: "Important notifications about your account.",
		icon: ShieldCheckIcon,
		title: "Account and security",
		settings: [
			{
				description:
					"Get notified about sign-ins from new devices or other security events.",
				icon: BellIcon,
				key: "security",
				label: "Security alerts",
			},
			{
				description:
					"Get important updates about your account, billing, and settings.",
				icon: BellIcon,
				key: "account",
				label: "Account updates",
			},
		],
	},
];

const initialSettings = {
	email: true,
	push: false,
	comments: true,
	updates: true,
	resources: false,
	replies: true,
	mentions: true,
	reports: true,
	security: true,
	account: true,
};

export function NotificationsPage() {
	const [settings, setSettings] = useState(initialSettings);
	const [frequency, setFrequency] = useState<Frequency>("important");

	return (
		<div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_16rem]">
			<main className="flex min-w-0 flex-col gap-3">
				{notificationGroups.map((group) => (
					<NotificationPanel
						group={group}
						key={group.title}
						onSettingChange={(key, checked) =>
							setSettings((current) => ({ ...current, [key]: checked }))
						}
						settings={settings}
					/>
				))}
			</main>
			<aside className="flex flex-col gap-3">
				<ScriptureQuote />
				<NotificationFrequency frequency={frequency} onChange={setFrequency} />
				<TipsCard />
			</aside>
		</div>
	);
}

function NotificationPanel({
	group,
	settings,
	onSettingChange,
}: {
	group: (typeof notificationGroups)[number];
	settings: typeof initialSettings;
	onSettingChange: (
		key: keyof typeof initialSettings,
		checked: boolean,
	) => void;
}) {
	const Icon = group.icon;

	return (
		<section className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm sm:px-5 sm:py-4">
			<header className="flex items-center gap-3">
				<div className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-secondary text-primary">
					<Icon aria-hidden="true" className="size-4" strokeWidth={1.7} />
				</div>
				<div className="min-w-0">
					<h2 className="font-serif text-lg leading-tight tracking-[-0.015em] sm:text-xl">
						{group.title}
					</h2>
					<p className="mt-0.5 text-muted-foreground text-xs leading-5">
						{group.description}
					</p>
				</div>
			</header>
			<Separator className="my-3" />
			<div className="divide-y divide-border/60">
				{group.settings.map((setting) => {
					const SettingIcon = setting.icon;
					const checked = settings[setting.key as keyof typeof settings];

					return (
						<Label
							className="flex cursor-pointer items-center gap-3 py-2 first:pt-0 last:pb-0"
							key={setting.key}
						>
							<SettingIcon
								aria-hidden="true"
								className="size-4 shrink-0 text-foreground"
								strokeWidth={1.8}
							/>
							<span className="min-w-0 flex-1">
								<span className="block font-medium text-sm leading-4">
									{setting.label}
								</span>
								<span className="mt-0.5 block text-muted-foreground text-xs leading-4">
									{setting.description}
								</span>
							</span>
							<Switch
								checked={checked}
								onCheckedChange={(nextChecked) =>
									onSettingChange(
										setting.key as keyof typeof initialSettings,
										nextChecked,
									)
								}
							/>
						</Label>
					);
				})}
			</div>
		</section>
	);
}

function ScriptureQuote() {
	return (
		<section className="relative hidden min-h-44 overflow-hidden rounded-xl border border-border bg-secondary md:block">
			<img
				alt=""
				className="absolute inset-0 size-full object-cover opacity-55"
				src="/landing/cta-hills.png"
			/>
			<div className="absolute inset-0 bg-linear-to-b from-secondary/90 via-secondary/55 to-transparent" />
			<blockquote className="relative p-5">
				<p className="font-serif text-foreground text-lg leading-[1.32] tracking-[-0.02em]">
					“Watch and be alert, for you do not know when the time will come.”
				</p>
				<footer className="mt-3 text-foreground/80 text-xs">Mark 13:33</footer>
			</blockquote>
		</section>
	);
}

function NotificationFrequency({
	frequency,
	onChange,
}: {
	frequency: Frequency;
	onChange: (value: Frequency) => void;
}) {
	return (
		<section className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
			<header className="flex items-center gap-3">
				<div className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-secondary text-primary">
					<Clock3Icon aria-hidden="true" className="size-4" strokeWidth={1.7} />
				</div>
				<div>
					<h2 className="font-serif text-lg tracking-[-0.015em]">
						Notification frequency
					</h2>
					<p className="mt-0.5 text-muted-foreground text-xs leading-4">
						Control how often you receive non-essential notifications.
					</p>
				</div>
			</header>
			<RadioGroup
				className="mt-4 gap-3"
				onValueChange={(value) => onChange(value as Frequency)}
				value={frequency}
			>
				<FrequencyOption
					description="Receive all notifications as they happen."
					label="All notifications"
					value="all"
				/>
				<FrequencyOption
					description="Only receive the most important notifications."
					label="Important only"
					value="important"
				/>
				<FrequencyOption
					description="Receive a limited number of notifications."
					label="Minimal"
					value="minimal"
				/>
			</RadioGroup>
		</section>
	);
}

function FrequencyOption({
	value,
	label,
	description,
}: {
	value: Frequency;
	label: string;
	description: string;
}) {
	return (
		<Label className="flex cursor-pointer items-start gap-3">
			<RadioGroupItem className="mt-0.5" value={value} />
			<span>
				<span className="block font-medium text-sm leading-4">{label}</span>
				<span className="mt-0.5 block text-muted-foreground text-xs leading-4">
					{description}
				</span>
			</span>
		</Label>
	);
}

function TipsCard() {
	return (
		<section className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
			<header className="flex items-center gap-3">
				<div className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-secondary text-primary">
					<LightbulbIcon
						aria-hidden="true"
						className="size-4"
						strokeWidth={1.7}
					/>
				</div>
				<h2 className="font-serif text-lg tracking-[-0.015em]">Tips</h2>
			</header>
			<p className="mt-3 text-muted-foreground text-xs leading-5">
				You can always change these settings later. We’ll only send you relevant
				notifications and you can unsubscribe at any time.
			</p>
			<Button className="mt-4 h-auto p-0 text-accent text-xs" variant="link">
				Learn more about notifications
				<ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
			</Button>
		</section>
	);
}
