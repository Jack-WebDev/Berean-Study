import {
	emptyRichTextDocument,
	type RichTextDocument,
	RichTextRenderer,
} from "@berean-study/rich-text-editor";
import { Badge } from "@berean-study/ui/components/badge";
import { Button } from "@berean-study/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { getPrayer } from "@/functions/prayers";

type Prayer = Awaited<ReturnType<typeof getPrayer>>;

export function PrayerDetailPage({ prayerId }: { prayerId: number }) {
	const [prayer, setPrayer] = useState<Prayer | undefined>(undefined);
	const [loadFailed, setLoadFailed] = useState(false);
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
			</article>
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
