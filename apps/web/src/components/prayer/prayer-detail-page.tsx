import {
	emptyRichTextDocument,
	type RichTextDocument,
	RichTextRenderer,
} from "@berean-study/rich-text-editor";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@berean-study/ui/components/alert-dialog";
import { Badge } from "@berean-study/ui/components/badge";
import { Button } from "@berean-study/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { deletePrayerReflection, getPrayer } from "@/functions/prayers";

type Prayer = Awaited<ReturnType<typeof getPrayer>>;

export function PrayerDetailPage({ prayerId }: { prayerId: number }) {
	const [prayer, setPrayer] = useState<Prayer | undefined>(undefined);
	const [loadFailed, setLoadFailed] = useState(false);
	const [reflectionToDelete, setReflectionToDelete] = useState<number | null>(
		null,
	);
	const [isDeletingReflection, setIsDeletingReflection] = useState(false);
	const loadPrayer = useCallback(async () => {
		setLoadFailed(false);
		try {
			setPrayer(await getPrayer({ data: { id: prayerId } }));
		} catch {
			setLoadFailed(true);
		}
	}, [prayerId]);
	useEffect(() => {
		void loadPrayer();
	}, [loadPrayer]);

	if (prayer === undefined) return <PrayerState title="Loading prayer…" />;
	if (loadFailed) {
		return <PrayerState onRetry={loadPrayer} title="Prayer unavailable" />;
	}
	if (prayer === null) return <PrayerState title="Prayer not found" />;
	const deleteReflection = async () => {
		if (reflectionToDelete === null) return;
		setIsDeletingReflection(true);
		try {
			const deleted = await deletePrayerReflection({
				data: { prayerId, reflectionId: reflectionToDelete },
			});
			if (!deleted) throw new Error("Reflection not found.");
			setPrayer((current) =>
				current
					? {
							...current,
							reflectionCount: current.reflectionCount - 1,
							reflections: current.reflections.filter(
								(reflection) => reflection.id !== reflectionToDelete,
							),
						}
					: current,
			);
			setReflectionToDelete(null);
			toast.success("Reflection deleted.");
		} catch {
			toast.error("We couldn't delete this reflection. Please try again.");
		} finally {
			setIsDeletingReflection(false);
		}
	};

	return (
		<div className="min-h-full bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
			<article className="mx-auto w-full max-w-3xl">
				<Link
					className="inline-flex items-center gap-2 font-medium text-primary text-xs hover:underline"
					to="/library/prayers"
				>
					<ArrowLeftIcon aria-hidden="true" className="size-3.5" /> Prayers
				</Link>
				<header className="mt-5">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<h1 className="font-serif text-3xl tracking-[-0.03em] sm:text-4xl">
								{prayer.title}
							</h1>
							<p className="mt-2 text-muted-foreground text-sm">
								{formatDate(prayer.createdAt)}
							</p>
						</div>
						<Button
							render={
								<Link
									params={{ prayerId }}
									to="/library/prayers/$prayerId/edit"
								/>
							}
							variant="outline"
						>
							<PencilIcon data-icon="inline-start" /> Edit prayer
						</Button>
					</div>
					{prayer.category ? (
						<Badge className="mt-3" variant="secondary">
							{prayer.category}
						</Badge>
					) : null}
				</header>
				<div className="mt-8">
					<RichTextRenderer
						document={parseContent(prayer.content)}
						preset="member"
					/>
				</div>
				<section className="mt-12 border-border border-t pt-8">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h2 className="font-serif text-2xl">Reflections</h2>
						<Button
							render={
								<Link
									params={{ prayerId }}
									to="/library/prayers/$prayerId/reflections/new"
								/>
							}
						>
							<PlusIcon data-icon="inline-start" /> Add reflection
						</Button>
					</div>
					{prayer.reflections.length === 0 ? (
						<div className="mt-5 rounded-lg border border-dashed p-5 text-muted-foreground text-sm">
							<p className="font-medium text-foreground">No reflections yet.</p>
							<p className="mt-1">
								Return here whenever you want to look back on this prayer and
								record what you&apos;re learning, seeing, or experiencing.
							</p>
						</div>
					) : (
						<div className="mt-5 space-y-6">
							{prayer.reflections.map((reflection) => (
								<article key={reflection.id}>
									<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
										<p className="font-medium text-muted-foreground text-sm">
											{formatDate(reflection.createdAt)}
										</p>
										<div className="flex gap-1">
											<Button
												render={
													<Link
														params={{ prayerId, reflectionId: reflection.id }}
														to="/library/prayers/$prayerId/reflections/$reflectionId/edit"
													/>
												}
												size="sm"
												variant="ghost"
											>
												<PencilIcon /> Edit
											</Button>
											<Button
												onClick={() => setReflectionToDelete(reflection.id)}
												size="sm"
												variant="ghost"
											>
												<Trash2Icon /> Delete
											</Button>
										</div>
									</div>
									<RichTextRenderer
										document={parseContent(reflection.content)}
										preset="member"
									/>
								</article>
							))}
						</div>
					)}
				</section>
			</article>
			<AlertDialog
				onOpenChange={(open) => {
					if (!open && !isDeletingReflection) setReflectionToDelete(null);
				}}
				open={reflectionToDelete !== null}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this reflection?</AlertDialogTitle>
						<AlertDialogDescription>
							This only removes this reflection. The prayer and its other
							reflections will remain unchanged.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeletingReflection}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={isDeletingReflection}
							onClick={deleteReflection}
						>
							{isDeletingReflection ? "Deleting…" : "Delete reflection"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function PrayerState({
	onRetry,
	title,
}: {
	onRetry?: () => void;
	title: string;
}) {
	return (
		<Empty className="min-h-80">
			<EmptyHeader>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>
					{onRetry
						? "Please try again."
						: "It may have been deleted or is no longer available."}
				</EmptyDescription>
			</EmptyHeader>
			{onRetry ? (
				<Button onClick={onRetry} variant="outline">
					Try again
				</Button>
			) : (
				<Button render={<Link to="/library/prayers" />} variant="outline">
					Back to prayers
				</Button>
			)}
		</Empty>
	);
}

function parseContent(content: string): RichTextDocument {
	try {
		const document = JSON.parse(content) as RichTextDocument;
		if (document.type === "doc") return document;
	} catch {}
	return emptyRichTextDocument;
}

function formatDate(value: Date | string) {
	return new Intl.DateTimeFormat(undefined, {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(new Date(value));
}
