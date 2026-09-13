import {
	defaultNotificationPreferences,
	type NotificationPreferences,
} from "@berean-study/db/notification-preferences";
import { Button } from "@berean-study/ui/components/button";
import { Label } from "@berean-study/ui/components/label";
import { Separator } from "@berean-study/ui/components/separator";
import { Switch } from "@berean-study/ui/components/switch";
import { Link } from "@tanstack/react-router";
import {
	BellRingIcon,
	CheckIcon,
	MailIcon,
	ShieldCheckIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
	getNotificationPreferences,
	updateNotificationPreferences,
} from "@/functions/notification-preferences";
import {
	getNotificationInbox,
	markAllNotificationsRead,
	markNotificationRead,
} from "@/functions/notifications";

type Inbox = Awaited<ReturnType<typeof getNotificationInbox>>;

export function NotificationsPage() {
	const [settings, setSettings] = useState<NotificationPreferences>(
		defaultNotificationPreferences,
	);
	const [inbox, setInbox] = useState<Inbox | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

	useEffect(() => {
		let active = true;

		void Promise.all([getNotificationPreferences(), getNotificationInbox()])
			.then(([preferences, nextInbox]) => {
				if (!active) return;
				setSettings(preferences);
				setInbox(nextInbox);
			})
			.catch(() => {
				if (active) {
					setLoadError(true);
					toast.error("Unable to load notification settings.");
				}
			})
			.finally(() => {
				if (active) setIsLoading(false);
			});

		return () => {
			active = false;
		};
	}, []);

	async function handleSettingChange(
		key: "email" | "security",
		checked: boolean,
	) {
		if (isSaving) return;

		const previousSettings = settings;
		const nextSettings = { ...settings, [key]: checked };
		setSettings(nextSettings);
		setIsSaving(true);

		try {
			await updateNotificationPreferences({ data: nextSettings });
			toast.success("Notification settings saved.");
		} catch {
			setSettings(previousSettings);
			toast.error("Unable to save notification settings.");
		} finally {
			setIsSaving(false);
		}
	}

	async function handleMarkRead(id: number) {
		if (!inbox) return;

		const notification = inbox.notifications.find((item) => item.id === id);
		if (!notification || notification.readAt) return;

		setInbox({
			...inbox,
			notifications: inbox.notifications.map((item) =>
				item.id === id ? { ...item, readAt: new Date() } : item,
			),
			unreadCount: inbox.unreadCount - 1,
		});

		try {
			await markNotificationRead({ data: { id } });
		} catch {
			try {
				setInbox(await getNotificationInbox());
			} catch {
				setLoadError(true);
			}
			toast.error("Unable to mark the notification as read.");
		}
	}

	async function handleMarkAllRead() {
		if (!inbox || inbox.unreadCount === 0 || isMarkingAllRead) return;
		setIsMarkingAllRead(true);

		try {
			await markAllNotificationsRead();
			setInbox({
				...inbox,
				notifications: inbox.notifications.map((item) => ({
					...item,
					readAt: item.readAt ?? new Date(),
				})),
				unreadCount: 0,
			});
			toast.success("All notifications marked as read.");
		} catch {
			toast.error("Unable to mark notifications as read.");
		} finally {
			setIsMarkingAllRead(false);
		}
	}

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-5">
			<NotificationSettings
				isLoading={isLoading}
				isSaving={isSaving}
				onChange={handleSettingChange}
				settings={settings}
			/>
			<NotificationInbox
				inbox={inbox}
				loadError={loadError}
				isLoading={isLoading}
				isMarkingAllRead={isMarkingAllRead}
				onMarkAllRead={handleMarkAllRead}
				onMarkRead={handleMarkRead}
			/>
		</div>
	);
}

function NotificationSettings({
	isLoading,
	isSaving,
	onChange,
	settings,
}: {
	isLoading: boolean;
	isSaving: boolean;
	onChange: (key: "email" | "security", checked: boolean) => void;
	settings: NotificationPreferences;
}) {
	return (
		<section className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm sm:px-5 sm:py-4">
			<header className="flex items-center gap-3">
				<div className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-secondary text-primary">
					<BellRingIcon
						aria-hidden="true"
						className="size-4"
						strokeWidth={1.7}
					/>
				</div>
				<div>
					<h2 className="font-serif text-lg leading-tight tracking-[-0.015em] sm:text-xl">
						Notification settings
					</h2>
					<p className="mt-0.5 text-muted-foreground text-xs leading-5">
						Control delivery of security notifications.
					</p>
				</div>
			</header>
			<Separator className="my-3" />
			<div className="divide-y divide-border/60">
				<Setting
					checked={settings.email}
					description="Allow security alerts to be delivered to your email address."
					disabled={isLoading || isSaving}
					icon={MailIcon}
					label="Email delivery"
					onCheckedChange={(checked) => onChange("email", checked)}
				/>
				<Setting
					checked={settings.security}
					description="Receive email alerts for new sign-ins and other security events."
					disabled={isLoading || isSaving}
					icon={ShieldCheckIcon}
					label="Security alerts"
					onCheckedChange={(checked) => onChange("security", checked)}
				/>
			</div>
		</section>
	);
}

function Setting({
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
	icon: typeof BellRingIcon;
	label: string;
	onCheckedChange: (checked: boolean) => void;
}) {
	return (
		<Label className="flex cursor-pointer items-center gap-3 py-2 first:pt-0 last:pb-0">
			<Icon
				aria-hidden="true"
				className="size-4 shrink-0 text-foreground"
				strokeWidth={1.8}
			/>
			<span className="min-w-0 flex-1">
				<span className="block font-medium text-sm leading-4">{label}</span>
				<span className="mt-0.5 block text-muted-foreground text-xs leading-4">
					{description}
				</span>
			</span>
			<Switch
				checked={checked}
				disabled={disabled}
				onCheckedChange={onCheckedChange}
			/>
		</Label>
	);
}

function NotificationInbox({
	inbox,
	isLoading,
	loadError,
	isMarkingAllRead,
	onMarkAllRead,
	onMarkRead,
}: {
	inbox: Inbox | null;
	isLoading: boolean;
	loadError: boolean;
	isMarkingAllRead: boolean;
	onMarkAllRead: () => void;
	onMarkRead: (id: number) => void;
}) {
	return (
		<section className="rounded-xl border border-border/60 bg-card shadow-sm">
			<header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
				<div>
					<h2 className="font-serif text-lg leading-tight tracking-[-0.015em] sm:text-xl">
						Inbox
						{inbox && inbox.unreadCount > 0 ? ` (${inbox.unreadCount})` : ""}
					</h2>
					<p className="mt-0.5 text-muted-foreground text-xs leading-5">
						Your most recent in-app notifications.
					</p>
				</div>
				<Button
					disabled={!inbox || inbox.unreadCount === 0 || isMarkingAllRead}
					onClick={onMarkAllRead}
					size="sm"
					variant="outline"
				>
					Mark all read
				</Button>
			</header>
			<Separator />
			{isLoading ? (
				<p className="px-4 py-6 text-muted-foreground text-sm sm:px-5">
					Loading notifications…
				</p>
			) : loadError ? (
				<p className="px-4 py-6 text-destructive text-sm sm:px-5">
					Notifications could not be loaded. Refresh the page to try again.
				</p>
			) : !inbox || inbox.notifications.length === 0 ? (
				<p className="px-4 py-6 text-muted-foreground text-sm sm:px-5">
					You have no notifications yet.
				</p>
			) : (
				<ul className="divide-y divide-border/60">
					{inbox.notifications.map((notification) => (
						<li className="px-4 py-3 sm:px-5" key={notification.id}>
							<div className="flex items-start gap-3">
								<div className="min-w-0 flex-1">
									{notification.destination ? (
										<Link
											className="font-medium text-sm hover:underline"
											onClick={() => onMarkRead(notification.id)}
											to={notification.destination as never}
										>
											{notification.title}
										</Link>
									) : (
										<p className="font-medium text-sm">{notification.title}</p>
									)}
									<p className="mt-1 text-muted-foreground text-sm">
										{notification.body}
									</p>
								</div>
								{notification.readAt ? (
									<CheckIcon
										aria-label="Read"
										className="mt-0.5 size-4 text-muted-foreground"
									/>
								) : (
									<Button
										onClick={() => onMarkRead(notification.id)}
										size="sm"
										variant="ghost"
									>
										Mark read
									</Button>
								)}
							</div>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
