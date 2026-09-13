import { Button } from "@berean-study/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import { Separator } from "@berean-study/ui/components/separator";
import { Link } from "@tanstack/react-router";
import {
	BellIcon,
	BookOpenIcon,
	ChevronRightIcon,
	Clock3Icon,
	Globe2Icon,
	type LucideIcon,
	MapPinIcon,
	MonitorIcon,
} from "lucide-react";
import { toast } from "sonner";

import { NotificationOptions } from "./notification-options";
import { fullDate, iconForKind, kindLabel } from "./notification-utils";
import type { Notification } from "./types";

export function NotificationDetail({
	notification,
}: {
	notification: Notification | undefined;
}) {
	if (!notification) {
		return (
			<Empty className="border-0">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<BellIcon aria-hidden="true" />
					</EmptyMedia>
					<EmptyTitle>Select a notification</EmptyTitle>
					<EmptyDescription>
						Choose an item from the inbox to view it here.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	const isSecurity = notification.kind === "security_sign_in";
	const Icon = iconForKind(notification.kind);

	return (
		<article className="min-w-0 px-[26px] py-[20px]">
			<div className="flex items-start justify-between">
				<div className="flex items-start gap-[22px]">
					<span
						className={[
							"grid size-[56px] shrink-0 place-items-center rounded-[12px]",
							isSecurity
								? "bg-red-50 text-red-600"
								: "bg-muted text-foreground",
						].join(" ")}
					>
						<Icon className="size-[27px]" strokeWidth={1.7} />
					</span>
					<div className="pt-[4px]">
						<p
							className={[
								"font-medium text-[10px] uppercase tracking-[0.025em]",
								isSecurity ? "text-red-600" : "text-muted-foreground",
							].join(" ")}
						>
							{kindLabel(notification.kind)}
						</p>
						<h2 className="mt-[5px] font-serif text-[22px] leading-[27px] tracking-[-0.025em]">
							{notification.title}
						</h2>
						<p className="mt-[4px] text-[13px] text-muted-foreground">
							{fullDate(notification.createdAt)}
						</p>
					</div>
				</div>
				<NotificationOptions compact />
			</div>

			<div
				className={[
					"mt-[22px] rounded-[9px] border-l-2 px-[18px] py-[17px]",
					isSecurity
						? "border-red-300 bg-[#fff0f1] dark:bg-red-950/20"
						: "border-border bg-muted/50",
				].join(" ")}
			>
				<p className="font-semibold font-serif text-[16px] leading-[20px]">
					{isSecurity
						? "We noticed a new sign-in to your account."
						: notification.title}
				</p>
				<p className="mt-[4px] text-[12px] text-muted-foreground leading-[18px]">
					{notification.body}
				</p>
			</div>

			{isSecurity ? (
				<SecurityNotificationContent notification={notification} />
			) : (
				<StandardNotificationContent notification={notification} />
			)}
		</article>
	);
}

function SecurityNotificationContent({
	notification,
}: {
	notification: Notification;
}) {
	return (
		<>
			<div className="mt-[14px] rounded-[9px] bg-muted/50 px-[20px] py-[14px]">
				<div className="grid gap-[12px]">
					<DetailRow
						icon={MonitorIcon}
						label="Device"
						value="Windows • Chrome"
					/>
					<DetailRow
						icon={MapPinIcon}
						label="Location"
						value="Johannesburg, South Africa"
					/>
					<DetailRow
						icon={Clock3Icon}
						label="Time"
						value={`${fullDate(notification.createdAt)} (SAST)`}
					/>
					<DetailRow
						icon={Globe2Icon}
						label="IP address"
						value="196.25.14.102"
					/>
				</div>
			</div>
			<div className="mt-[19px] flex items-center gap-[18px]">
				<Button
					className="h-[40px] min-w-[216px] rounded-[7px] bg-[#102a50] px-[20px] text-[12px] text-white hover:bg-[#102a50]/95"
					render={<Link to="/account/security" />}
				>
					Review account security
					<ChevronRightIcon aria-hidden="true" data-icon="inline-end" />
				</Button>
				<Button
					className="h-[40px] rounded-[7px] px-[24px] text-[12px]"
					onClick={() => toast.success("Sign-in confirmed.")}
					variant="outline"
				>
					This was me
				</Button>
			</div>
			<Separator className="mt-[22px] bg-border/70" />
			<div className="mt-[18px] flex gap-[18px] rounded-[9px] bg-muted/45 px-[21px] py-[18px]">
				<BookOpenIcon className="mt-[1px] size-[21px] shrink-0" />
				<div>
					<p className="font-medium text-[13px]">Need help?</p>
					<p className="mt-[4px] text-[11px] text-muted-foreground leading-[17px]">
						Learn how to keep your account secure and manage your active
						sessions.
					</p>
					<Link
						className="mt-[6px] inline-flex items-center gap-[6px] text-[#21477d] text-[11px] hover:underline"
						to="/account/security"
					>
						View security help center
						<ChevronRightIcon className="size-[12px]" />
					</Link>
				</div>
			</div>
		</>
	);
}

function StandardNotificationContent({
	notification,
}: {
	notification: Notification;
}) {
	return (
		<>
			{notification.destination ? (
				<Button
					className="mt-5 h-[40px] rounded-[7px] px-5 text-[12px]"
					render={<Link to={notification.destination as never} />}
				>
					Open related item
				</Button>
			) : null}
			<Separator className="mt-6 bg-border/70" />
		</>
	);
}

function DetailRow({
	icon: Icon,
	label,
	value,
}: {
	icon: LucideIcon;
	label: string;
	value: string;
}) {
	return (
		<div className="grid grid-cols-[20px_96px_minmax(0,1fr)] items-center gap-[8px]">
			<Icon className="size-[17px]" strokeWidth={1.7} />
			<span className="text-[12px]">{label}</span>
			<span className="text-[12px] text-foreground">{value}</span>
		</div>
	);
}
