import { Button, buttonVariants } from "@berean-study/ui/components/button";
import { Textarea } from "@berean-study/ui/components/textarea";
import { cn } from "@berean-study/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { publishVersePost } from "@/functions/community";
import { myPostingRestrictionQueryOptions } from "@/queries/community";
import { communityKeys } from "@/queries/keys";
import { verseWordsQueryOptions } from "@/queries/reader";
import { formatFullDate } from "@/utils/dates";

/** The most a thought can say, matching the summary of other Community posts. */
const thoughtLimit = 500;

/**
 * Shares Bible verses from the reader with Community. The verse words are shown
 * exactly as published and can't be changed; the member can add a thought of
 * their own underneath if they want.
 */
export function VerseSharePage({
	bookSlug,
	chapter,
	translationAbbreviation,
	verses,
}: {
	bookSlug: string;
	chapter: number;
	translationAbbreviation: string;
	verses: number[];
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const thoughtId = useId();
	const helpId = useId();
	const [thought, setThought] = useState("");
	const chosen = { bookSlug, chapter, translationAbbreviation, verses };
	const words = useQuery(verseWordsQueryOptions(chosen));
	const { data: restrictedUntil } = useQuery(
		myPostingRestrictionQueryOptions(),
	);

	const publish = useMutation({
		mutationFn: () => publishVersePost({ data: { ...chosen, thought } }),
		onError: () =>
			toast.error(
				"We couldn't share these verses. Check your connection, then try again.",
			),
		onSuccess: async (result) => {
			await queryClient.invalidateQueries({ queryKey: communityKeys.all });
			if ("refused" in result) {
				toast.error(
					result.refused === "restricted"
						? `You can share with Community again from ${formatFullDate(result.restrictedUntil)}.`
						: "These verses can't be shared.",
				);
				return;
			}
			toast.success("Published to Community.");
			void navigate({ search: { view: "verse" }, to: "/community" });
		},
	});

	// "Romans 8:28 (KJV)" becomes "Romans 8".
	const backLabel = words.data
		? words.data.reference.replace(/:.*$/, "")
		: "reading";

	return (
		<main className="min-h-full bg-background text-foreground">
			<div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-14">
				<Link
					className={cn(
						buttonVariants({ size: "sm", variant: "ghost" }),
						"w-fit rounded-md text-muted-foreground",
					)}
					params={{ book: bookSlug, chapter }}
					search={{ verse: verses[0] }}
					to="/bible/$book/$chapter"
				>
					<ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
					Back to {backLabel}
				</Link>
				<header>
					<h1 className="font-serif text-4xl leading-none tracking-[-0.045em] sm:text-5xl">
						Share with Community
					</h1>
					<p className="mt-4 text-base text-muted-foreground leading-7 sm:text-[1.0625rem]">
						Share these verses with others. You can add a few words about what
						they mean to you.
					</p>
				</header>

				{restrictedUntil ? (
					<p
						className="rounded-xl bg-status-attention p-4 text-sm text-status-attention-foreground"
						role="status"
					>
						A moderator has restricted your posting, so you can't share with
						Community until {formatFullDate(restrictedUntil)}. You can still
						read Community. See the{" "}
						<Link className="underline" to="/community/guidelines">
							Community Guidelines
						</Link>
						.
					</p>
				) : null}

				{words.isPending ? (
					<p className="text-muted-foreground text-sm">Finding the verses…</p>
				) : words.isError ? (
					<div className="flex items-center gap-3" role="alert">
						<p className="text-destructive text-sm">
							We couldn't find these verses. Go back and choose them again.
						</p>
						<Button
							onClick={() => void words.refetch()}
							size="sm"
							variant="outline"
						>
							Try again
						</Button>
					</div>
				) : (
					<form
						className="flex flex-col gap-6"
						onSubmit={(event) => {
							event.preventDefault();
							publish.mutate();
						}}
					>
						<figure className="rounded-xl border border-scripture-border bg-scripture p-5">
							<blockquote className="font-serif text-foreground text-lg leading-relaxed">
								“{words.data.text}”
							</blockquote>
							<figcaption className="mt-3 font-medium text-scripture-foreground text-sm">
								{words.data.reference}
							</figcaption>
						</figure>

						<div className="flex flex-col gap-2">
							<label className="font-medium text-sm" htmlFor={thoughtId}>
								Your thoughts (optional)
							</label>
							<Textarea
								aria-describedby={helpId}
								className="min-h-32 text-base"
								id={thoughtId}
								maxLength={thoughtLimit}
								onChange={(event) => setThought(event.target.value)}
								value={thought}
							/>
							<p className="text-muted-foreground text-xs" id={helpId}>
								What these verses mean to you, in your own words. Up to{" "}
								{thoughtLimit} characters.
							</p>
						</div>

						<div className="flex justify-end">
							<Button
								className="h-11 rounded-lg px-6"
								disabled={publish.isPending || Boolean(restrictedUntil)}
								type="submit"
							>
								{publish.isPending ? "Publishing…" : "Publish"}
							</Button>
						</div>
					</form>
				)}
			</div>
		</main>
	);
}
