import { Input } from "@berean-study/ui/components/input";
import { Label } from "@berean-study/ui/components/label";
import { Textarea } from "@berean-study/ui/components/textarea";
import { cn } from "@berean-study/ui/lib/utils";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type FormEvent, useId, useState } from "react";
import { toast } from "sonner";

import {
	recordTranslationPermission,
	removeTranslationPermission,
	updateTranslationDetails,
} from "@/functions/translations";
import { formatStaffDate } from "@/lib/format";
import { auditKeys, scriptureDataKeys } from "@/queries/keys";
import { translationsOverviewQueryOptions } from "@/queries/scripture-data";

import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { ReasonField, StaffFormDialog } from "../staff-form-dialog";
import { StaffPage } from "../staff-page";

type Overview = Awaited<
	ReturnType<
		NonNullable<ReturnType<typeof translationsOverviewQueryOptions>["queryFn"]>
	>
>;
type Selected = NonNullable<Overview["selected"]>;
type BookState = Selected["books"][number]["state"];

const stateLabels: Record<BookState, string> = {
	published: "Published",
	proofreading: "Proofreading",
	entering: "Being entered",
	not_started: "Not started",
};

const stateClassNames: Record<BookState, string> = {
	published: "bg-progress-published text-progress-published-foreground",
	proofreading:
		"bg-progress-proofreading text-progress-proofreading-foreground",
	entering: "bg-progress-entering text-progress-entering-foreground",
	not_started: "bg-progress-not-started text-progress-not-started-foreground",
};

const states = Object.keys(stateLabels) as BookState[];

function formatShare(share: number) {
	if (share === 0) return "0%";
	if (share < 0.01) return "Under 1%";
	return `${Math.round(share * 100)}%`;
}

function useTranslationSettled() {
	const queryClient = useQueryClient();
	return () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: scriptureDataKeys.all }),
			queryClient.invalidateQueries({ queryKey: auditKeys.all }),
		]);
}

export function TranslationsPage({ abbreviation }: { abbreviation?: string }) {
	const { data } = useSuspenseQuery(
		translationsOverviewQueryOptions(abbreviation),
	);
	const { list, selected } = data;

	return (
		<StaffPage
			actions={
				<Link
					className={staffLinkClassName}
					params={{ section: "scripture" }}
					to="/work/$section"
				>
					Enter verses
				</Link>
			}
			description="Berean Study supports exactly six translations. Their text is typed or pasted in by your team, proofread by someone else, then published."
			section="Management"
			title="Translations"
		>
			<ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
				{list.map((translation) => {
					const active = translation.abbreviation === selected?.abbreviation;
					return (
						<li key={translation.abbreviation}>
							<Link
								aria-current={active ? "true" : undefined}
								className={cn(
									"flex h-full flex-col gap-1.5 rounded-[0.875rem] border p-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
									active
										? "border-accent bg-sidebar-accent"
										: "border-border bg-card hover:bg-muted",
								)}
								search={{ t: translation.abbreviation }}
								to="/admin/translations"
							>
								<span className="font-semibold text-sm">
									{translation.abbreviation}
								</span>
								<span className="text-muted-foreground text-xs">
									{translation.name}
								</span>
								<span
									aria-hidden="true"
									className="mt-auto block h-1.5 overflow-hidden rounded-full bg-progress-not-started"
								>
									<span
										className="block h-full rounded-full bg-progress-published"
										style={{
											width: `${Math.min(100, translation.publishedShare * 100)}%`,
										}}
									/>
								</span>
								<span className="text-muted-foreground text-xs">
									{formatShare(translation.publishedShare)} published
								</span>
							</Link>
						</li>
					);
				})}
			</ul>

			{selected ? (
				<div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
					<BookProgress selected={selected} />
					<TranslationDetails
						// Recording permission also changes these fields, and the form
						// has to start again from what was saved, or a later save would
						// overwrite them with stale values.
						key={`${selected.abbreviation}-${selected.rightsHolder}-${selected.copyrightNotice}`}
						selected={selected}
					/>
				</div>
			) : (
				<StaffCard className="mt-6">
					<p className="text-sm" role="alert">
						The translations haven't been set up yet. Run db:scripture:sync.
					</p>
				</StaffCard>
			)}
		</StaffPage>
	);
}

function BookProgress({ selected }: { selected: Selected }) {
	return (
		<StaffCard title={`${selected.abbreviation} progress by book`}>
			<ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
				{states.map((state) => (
					<li className="flex items-center gap-1.5" key={state}>
						<span
							aria-hidden="true"
							className={cn("size-3 rounded-sm", stateClassNames[state])}
						/>
						{stateLabels[state]}
					</li>
				))}
			</ul>
			<ul className="grid grid-cols-[repeat(auto-fill,minmax(3.75rem,1fr))] gap-1.5">
				{selected.books.map((book) => (
					<li key={book.slug}>
						<Link
							aria-label={`${book.name}: ${stateLabels[book.state]}`}
							className={cn(
								"grid min-h-11 place-items-center rounded-lg px-1 text-center font-bold text-xs transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								stateClassNames[book.state],
							)}
							params={{ section: "scripture" }}
							title={`${book.name}: ${stateLabels[book.state]}, ${book.publishedVerses} of ${book.expectedVerses} verses published`}
							to="/work/$section"
						>
							{book.shortName}
						</Link>
					</li>
				))}
			</ul>
			<dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
				{states.map((state) => (
					<div key={state}>
						<dd className="font-serif text-2xl tabular-nums">
							{selected.books.filter((book) => book.state === state).length}
						</dd>
						<dt className="text-muted-foreground text-xs">
							{stateLabels[state]}
						</dt>
					</div>
				))}
			</dl>
		</StaffCard>
	);
}

function TranslationDetails({ selected }: { selected: Selected }) {
	const nameId = useId();
	const editionId = useId();
	const holderId = useId();
	const noticeId = useId();
	const [name, setName] = useState(selected.name);
	const [edition, setEdition] = useState(selected.edition ?? "");
	const [rightsHolder, setRightsHolder] = useState(selected.rightsHolder ?? "");
	const [copyrightNotice, setCopyrightNotice] = useState(
		selected.copyrightNotice ?? "",
	);
	const settled = useTranslationSettled();
	const mutation = useMutation({
		mutationFn: () =>
			updateTranslationDetails({
				data: {
					abbreviation: selected.abbreviation,
					name,
					edition,
					rightsHolder,
					copyrightNotice,
				},
			}),
		onSuccess: async () => {
			await settled();
			toast.success(`${selected.abbreviation} details saved`);
		},
		onError: (error) => toast.error(error.message),
	});

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		mutation.mutate();
	}

	return (
		<StaffCard title={`${selected.abbreviation} details`}>
			<form className="space-y-4" onSubmit={submit}>
				<div className="space-y-2">
					<Label htmlFor={nameId}>Full name</Label>
					<Input
						className="h-11 rounded-[0.625rem]"
						id={nameId}
						onChange={(event) => setName(event.target.value)}
						required
						value={name}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor={editionId}>Edition being entered</Label>
					<Input
						className="h-11 rounded-[0.625rem]"
						id={editionId}
						onChange={(event) => setEdition(event.target.value)}
						value={edition}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor={holderId}>Rights holder</Label>
					<Input
						className="h-11 rounded-[0.625rem]"
						id={holderId}
						onChange={(event) => setRightsHolder(event.target.value)}
						value={rightsHolder}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor={noticeId}>Copyright notice shown to readers</Label>
					<Textarea
						className="min-h-20 rounded-[0.625rem] text-sm"
						id={noticeId}
						onChange={(event) => setCopyrightNotice(event.target.value)}
						placeholder="The exact wording the rights holder requires"
						value={copyrightNotice}
					/>
				</div>
				<StaffButton
					disabled={mutation.isPending}
					type="submit"
					variant="outline"
				>
					Save details
				</StaffButton>
			</form>
			{selected.licensed ? (
				<PublishingPermission
					copyrightNotice={copyrightNotice}
					rightsHolder={rightsHolder}
					selected={selected}
				/>
			) : null}
		</StaffCard>
	);
}

function PublishingPermission({
	copyrightNotice,
	rightsHolder,
	selected,
}: {
	copyrightNotice: string;
	rightsHolder: string;
	selected: Selected;
}) {
	const [dialog, setDialog] = useState<"record" | "remove" | null>(null);
	const closeDialog = (open: boolean) => {
		if (!open) setDialog(null);
	};
	const recorded = selected.permissionRecordedAt;
	const ended = selected.publishingBlock === "licence_ended";

	return (
		<div
			className={cn(
				"mt-5 rounded-[0.875rem] p-4 text-sm",
				!recorded && "bg-status-attention text-status-attention-foreground",
				recorded &&
					!ended &&
					"bg-status-success text-status-success-foreground",
				ended && "bg-status-danger text-status-danger-foreground",
			)}
		>
			{recorded ? (
				<>
					<p className="font-semibold">
						{ended
							? "Licence ended: publishing is locked"
							: "Permission to publish: recorded"}
					</p>
					<p className="mt-1">
						Recorded {formatStaffDate(recorded)}
						{selected.licenceEndsOn
							? `. Licence ends ${selected.licenceEndsOn}`
							: ""}
						.
						{selected.quotationLimits
							? ` Quotation limits: ${selected.quotationLimits}`
							: ""}
					</p>
				</>
			) : (
				<>
					<p className="font-semibold">Permission to publish: not recorded</p>
					<p className="mt-1">
						Entering and proofreading can go ahead. Publishing{" "}
						{selected.abbreviation} chapters stays locked until a Superadmin
						records the rights holder's permission and any quotation limits.
					</p>
				</>
			)}
			<div className="mt-3 flex flex-wrap gap-2">
				<StaffButton onClick={() => setDialog("record")} variant="outline">
					{recorded ? "Update permission" : "Record permission"}
				</StaffButton>
				{recorded ? (
					<StaffButton onClick={() => setDialog("remove")} variant="outline">
						Remove permission
					</StaffButton>
				) : null}
			</div>

			<RecordPermissionDialog
				abbreviation={selected.abbreviation}
				initial={{
					copyrightNotice,
					licenceEndsOn: selected.licenceEndsOn ?? "",
					quotationLimits: selected.quotationLimits ?? "",
					rightsHolder,
				}}
				key={`${dialog}-${selected.abbreviation}`}
				onOpenChange={closeDialog}
				open={dialog === "record"}
			/>
			<RemovePermissionDialog
				abbreviation={selected.abbreviation}
				onOpenChange={closeDialog}
				open={dialog === "remove"}
			/>
		</div>
	);
}

function RecordPermissionDialog({
	abbreviation,
	initial,
	onOpenChange,
	open,
}: {
	abbreviation: string;
	initial: {
		copyrightNotice: string;
		licenceEndsOn: string;
		quotationLimits: string;
		rightsHolder: string;
	};
	onOpenChange: (open: boolean) => void;
	open: boolean;
}) {
	const holderId = useId();
	const noticeId = useId();
	const endId = useId();
	const limitsId = useId();
	const [rightsHolder, setRightsHolder] = useState(initial.rightsHolder);
	const [copyrightNotice, setCopyrightNotice] = useState(
		initial.copyrightNotice,
	);
	const [licenceEndsOn, setLicenceEndsOn] = useState(initial.licenceEndsOn);
	const [quotationLimits, setQuotationLimits] = useState(
		initial.quotationLimits,
	);
	const [reason, setReason] = useState("");
	const settled = useTranslationSettled();
	const mutation = useMutation({
		mutationFn: () =>
			recordTranslationPermission({
				data: {
					abbreviation,
					rightsHolder,
					copyrightNotice,
					licenceEndsOn: licenceEndsOn || null,
					quotationLimits,
					reason,
				},
			}),
		onSuccess: async () => {
			await settled();
			toast.success(`Permission recorded for ${abbreviation}`);
			onOpenChange(false);
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<StaffFormDialog
			canSubmit={
				rightsHolder.trim().length > 0 &&
				copyrightNotice.trim().length > 0 &&
				reason.trim().length > 0
			}
			description={`Publishing ${abbreviation} chapters unlocks as soon as you save, so only record this once you hold the rights holder's permission.`}
			onOpenChange={onOpenChange}
			onSubmit={() => mutation.mutate()}
			open={open}
			pending={mutation.isPending}
			submitLabel="Record permission"
			title={`Record permission for ${abbreviation}`}
		>
			<div className="space-y-2">
				<Label htmlFor={holderId}>Rights holder</Label>
				<Input
					className="h-11 rounded-[0.625rem]"
					id={holderId}
					onChange={(event) => setRightsHolder(event.target.value)}
					required
					value={rightsHolder}
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor={noticeId}>Copyright notice shown to readers</Label>
				<Textarea
					className="min-h-20 rounded-[0.625rem] text-sm"
					id={noticeId}
					onChange={(event) => setCopyrightNotice(event.target.value)}
					required
					value={copyrightNotice}
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor={endId}>Licence end date, if any</Label>
				<Input
					className="h-11 rounded-[0.625rem]"
					id={endId}
					onChange={(event) => setLicenceEndsOn(event.target.value)}
					type="date"
					value={licenceEndsOn}
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor={limitsId}>Quotation limits, if any</Label>
				<Input
					className="h-11 rounded-[0.625rem]"
					id={limitsId}
					onChange={(event) => setQuotationLimits(event.target.value)}
					value={quotationLimits}
				/>
			</div>
			<ReasonField
				hint="Recorded in the audit log under your name."
				label="Where the permission is recorded"
				onChange={setReason}
				value={reason}
			/>
		</StaffFormDialog>
	);
}

function RemovePermissionDialog({
	abbreviation,
	onOpenChange,
	open,
}: {
	abbreviation: string;
	onOpenChange: (open: boolean) => void;
	open: boolean;
}) {
	const [reason, setReason] = useState("");
	const settled = useTranslationSettled();
	const mutation = useMutation({
		mutationFn: () =>
			removeTranslationPermission({ data: { abbreviation, reason } }),
		onSuccess: async () => {
			await settled();
			toast.success(`Permission removed for ${abbreviation}`);
			setReason("");
			onOpenChange(false);
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<StaffFormDialog
			canSubmit={reason.trim().length > 0}
			description={`Publishing ${abbreviation} chapters locks again as soon as you save.`}
			destructive
			onOpenChange={onOpenChange}
			onSubmit={() => mutation.mutate()}
			open={open}
			pending={mutation.isPending}
			submitLabel="Remove permission"
			title={`Remove permission for ${abbreviation}`}
		>
			<ReasonField
				hint="Recorded in the audit log under your name."
				onChange={setReason}
				value={reason}
			/>
		</StaffFormDialog>
	);
}
