import { Button, buttonVariants } from "@berean-study/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@berean-study/ui/components/card";
import { Input } from "@berean-study/ui/components/input";
import { Textarea } from "@berean-study/ui/components/textarea";
import { cn } from "@berean-study/ui/lib/utils";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	BookOpenIcon,
	CheckIcon,
	FileTextIcon,
	FolderIcon,
	HeartIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
	listCommunityPublishingResources,
	publishCommunityPost,
} from "@/functions/community";

type Resource = Awaited<
	ReturnType<typeof listCommunityPublishingResources>
>[number];
type PostType = Resource["type"];

const publishingTypes = [
	{
		description: "Share a reflection from your personal study.",
		icon: FileTextIcon,
		label: "Note",
		value: "note",
	},
	{
		description: "Share a curated set of study material.",
		icon: FolderIcon,
		label: "Collection",
		value: "collection",
	},
	{
		description: "Share how God has been at work in your life.",
		icon: BookOpenIcon,
		label: "Testimony",
		value: "testimony",
	},
	{
		description: "Invite the community to pray with you.",
		icon: HeartIcon,
		label: "Prayer",
		value: "prayer",
	},
] as const;

export function CommunitySharePage() {
	const navigate = useNavigate({ from: "/community/share" });
	const router = useRouter();
	const [resources, setResources] = useState<Resource[] | null>(null);
	const [loadFailed, setLoadFailed] = useState(false);
	const [type, setType] = useState<PostType | null>(null);
	const [sourceId, setSourceId] = useState<number | null>(null);
	const [title, setTitle] = useState("");
	const [excerpt, setExcerpt] = useState("");
	const [isPreviewing, setIsPreviewing] = useState(false);
	const [isPublishing, setIsPublishing] = useState(false);

	const loadResources = useCallback(async () => {
		setLoadFailed(false);
		try {
			setResources(await listCommunityPublishingResources());
		} catch {
			setLoadFailed(true);
		}
	}, []);
	useEffect(() => {
		void loadResources();
	}, [loadResources]);

	const available = useMemo(
		() => resources?.filter((item) => item.type === type) ?? [],
		[resources, type],
	);
	const selected = available.find((item) => item.id === sourceId);
	const chooseType = (nextType: PostType) => {
		setType(nextType);
		setSourceId(null);
		setTitle("");
		setExcerpt("");
		setIsPreviewing(false);
	};
	const chooseResource = (resource: Resource) => {
		setSourceId(resource.id);
		setTitle(resource.title);
		setExcerpt(resource.excerpt);
		setIsPreviewing(false);
	};
	const publish = async () => {
		if (!type || !selected || !title.trim() || !excerpt.trim()) return;
		setIsPublishing(true);
		try {
			const result = await publishCommunityPost({
				data: { excerpt, sourceId: selected.id, title, type },
			});
			if (!result) throw new Error("Unable to publish Community post.");
			await router.invalidate();
			toast.success(
				result.alreadyPublished
					? "This item is already shared with Community."
					: "Published to Community.",
			);
			navigate({ to: "/community" });
		} catch {
			toast.error("We couldn't publish this item. Please try again.");
		} finally {
			setIsPublishing(false);
		}
	};

	return (
		<main className="min-h-full bg-background text-foreground">
			<div className="mx-auto flex w-full max-w-[72rem] flex-col gap-8 px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
				<Link
					className={cn(
						buttonVariants({ size: "sm", variant: "ghost" }),
						"w-fit rounded-md text-muted-foreground",
					)}
					to="/community"
				>
					<ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
					Back to Community
				</Link>
				<header className="max-w-2xl">
					<h1 className="font-serif text-4xl leading-none tracking-[-0.045em] sm:text-5xl">
						Share with Community
					</h1>
					<p className="mt-4 text-base text-muted-foreground leading-7 sm:text-[1.0625rem]">
						Choose something from your personal library, then prepare the
						version you would like to share with the community.
					</p>
				</header>
				{resources === null && !loadFailed ? (
					<p className="text-muted-foreground text-sm">Loading your library…</p>
				) : null}
				{loadFailed ? (
					<div className="flex items-center gap-3">
						<p className="text-destructive text-sm">
							Your library could not be loaded.
						</p>
						<Button
							onClick={() => void loadResources()}
							size="sm"
							type="button"
							variant="outline"
						>
							Try again
						</Button>
					</div>
				) : null}
				{resources ? (
					<>
						<section aria-labelledby="community-share-type-title">
							<h2
								className="font-serif text-2xl tracking-[-0.03em]"
								id="community-share-type-title"
							>
								1. Choose what to share
							</h2>
							<div className="mt-4 grid gap-3 sm:grid-cols-2">
								{publishingTypes.map((option) => {
									const Icon = option.icon;
									const isSelected = type === option.value;
									return (
										<button
											aria-pressed={isSelected}
											className={cn(
												"rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
												isSelected && "ring-2 ring-primary",
											)}
											key={option.value}
											onClick={() => chooseType(option.value)}
											type="button"
										>
											<Card className="h-full rounded-xl border-border/70 py-0 transition-colors hover:bg-muted/40">
												<CardHeader className="gap-3 px-5 pt-5 pb-2">
													<Icon
														aria-hidden="true"
														className="size-5 text-primary"
													/>
													<CardTitle className="font-serif text-xl">
														{option.label}
													</CardTitle>
												</CardHeader>
												<CardContent className="px-5 pb-5 text-muted-foreground text-sm">
													{option.description}
												</CardContent>
											</Card>
										</button>
									);
								})}
							</div>
						</section>
						{type ? (
							<section aria-labelledby="community-share-resource-title">
								<h2
									className="font-serif text-2xl tracking-[-0.03em]"
									id="community-share-resource-title"
								>
									2. Select from your library
								</h2>
								{available.length === 0 ? (
									<p className="mt-3 text-muted-foreground text-sm">
										You do not have any {type}s ready to share yet.
									</p>
								) : (
									<div className="mt-4 grid gap-3">
										{available.map((resource) => (
											<button
												aria-pressed={sourceId === resource.id}
												className={cn(
													"rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
													sourceId === resource.id && "ring-2 ring-primary",
												)}
												disabled={resource.isPublished}
												key={resource.id}
												onClick={() => chooseResource(resource)}
												type="button"
											>
												<Card className="rounded-xl border-border/70 py-0">
													<CardContent className="flex items-start gap-3 px-5 py-4">
														<div className="min-w-0 flex-1">
															<h3 className="font-medium">{resource.title}</h3>
															<p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
																{resource.excerpt || "No description yet."}
															</p>
														</div>
														{resource.isPublished ? (
															<span className="shrink-0 text-muted-foreground text-xs">
																Already shared
															</span>
														) : sourceId === resource.id ? (
															<CheckIcon
																aria-hidden="true"
																className="mt-1 size-4 text-primary"
															/>
														) : null}
													</CardContent>
												</Card>
											</button>
										))}
									</div>
								)}
							</section>
						) : null}
						{selected && type ? (
							<section aria-labelledby="community-share-presentation-title">
								<h2
									className="font-serif text-2xl tracking-[-0.03em]"
									id="community-share-presentation-title"
								>
									3. Prepare your Community post
								</h2>
								{isPreviewing ? (
									<PostPreview excerpt={excerpt} title={title} type={type} />
								) : (
									<div className="mt-4 grid max-w-2xl gap-4">
										<label
											className="grid gap-2 font-medium text-sm"
											htmlFor="community-post-title"
										>
											Title
											<Input
												id="community-post-title"
												maxLength={200}
												onChange={(event) => setTitle(event.target.value)}
												value={title}
											/>
										</label>
										<label
											className="grid gap-2 font-medium text-sm"
											htmlFor="community-post-excerpt"
										>
											Community description
											<Textarea
												id="community-post-excerpt"
												maxLength={500}
												onChange={(event) => setExcerpt(event.target.value)}
												rows={5}
												value={excerpt}
											/>
										</label>
									</div>
								)}
								<div className="mt-5 flex flex-wrap gap-3">
									{isPreviewing ? (
										<Button
											onClick={() => setIsPreviewing(false)}
											type="button"
											variant="outline"
										>
											Edit presentation
										</Button>
									) : (
										<Button
											disabled={!title.trim() || !excerpt.trim()}
											onClick={() => setIsPreviewing(true)}
											type="button"
										>
											Preview
										</Button>
									)}
									{isPreviewing ? (
										<Button
											disabled={isPublishing}
											onClick={() => void publish()}
											type="button"
										>
											{isPublishing ? "Publishing…" : "Publish to Community"}
										</Button>
									) : null}
								</div>
							</section>
						) : null}
					</>
				) : null}
			</div>
		</main>
	);
}

function PostPreview({
	excerpt,
	title,
	type,
}: {
	excerpt: string;
	title: string;
	type: PostType;
}) {
	return (
		<Card className="mt-4 max-w-2xl rounded-xl border-border/70 py-0">
			<CardHeader className="px-5 pt-5">
				<p className="font-medium text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
					Community {type}
				</p>
				<CardTitle className="font-serif text-2xl">{title}</CardTitle>
			</CardHeader>
			<CardContent className="px-5 pb-5 text-muted-foreground leading-7">
				{excerpt}
			</CardContent>
		</Card>
	);
}
