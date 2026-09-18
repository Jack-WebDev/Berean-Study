import {
	getWordCount,
	type RichTextDocument,
	RichTextEditor,
} from "@berean-study/rich-text-editor";
import { Badge } from "@berean-study/ui/components/badge";
import { Button } from "@berean-study/ui/components/button";
import { Card, CardContent } from "@berean-study/ui/components/card";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@berean-study/ui/components/field";
import { Input } from "@berean-study/ui/components/input";
import { Separator } from "@berean-study/ui/components/separator";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@berean-study/ui/components/toggle-group";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	BookOpenIcon,
	Clock3Icon,
	EyeIcon,
	LeafIcon,
	LockIcon,
	PlusIcon,
	SearchIcon,
	UsersRoundIcon,
} from "lucide-react";
import { useState } from "react";

const starterPrayer: RichTextDocument = {
	type: "doc",
	content: [
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Lord, I come to You today with a sincere heart.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Help me discern Your will and trust Your timing. Give me wisdom and clarity as I consider the next steps in my life, and help me to walk in faith, knowing that You are with me.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Teach me to be patient in the waiting and to remain faithful, even when the path is unclear. May Your peace guard my heart and mind as I seek to follow You.",
				},
			],
		},
		{
			type: "paragraph",
			content: [{ type: "text", text: "In Jesus’ name, Amen." }],
		},
	],
};

export function NewPrayerPage() {
	const navigate = useNavigate();
	const [title, setTitle] = useState("Guidance for next season");
	const [content, setContent] = useState(starterPrayer);
	const [visibility, setVisibility] = useState("private");
	const [category, setCategory] = useState("Guidance");

	return (
		<div className="min-h-full px-5 py-5 sm:px-8 lg:px-12">
			<main className="mx-auto flex w-full max-w-7xl flex-col gap-3">
				<header className="relative">
					<h1 className="font-serif text-4xl text-primary tracking-[-0.035em] sm:text-5xl">
						New Prayer
					</h1>
					<p className="mt-1 text-muted-foreground">
						Record a prayer so you can revisit it and reflect on God’s
						faithfulness over time.
					</p>
					<div className="absolute top-0 right-0 hidden w-72 text-center text-muted-foreground text-xs italic leading-4 xl:block">
						“Do not be anxious about anything, but in everything by prayer and
						supplication with thanksgiving let your requests be made known to
						God.”<span className="mt-2 block not-italic">Philippians 4:6</span>
					</div>
				</header>
				<NewPrayerBenefits />
				<div className="grid gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(23rem,.95fr)]">
					<form
						className="min-w-0"
						onSubmit={(event) => {
							event.preventDefault();
							navigate({ to: "/library/prayers" });
						}}
					>
						<Card className="gap-0 rounded-xl py-0 shadow-sm ring-foreground/8">
							<CardContent className="p-4">
								<Link
									className="inline-flex items-center gap-2 text-primary text-xs hover:underline"
									to="/library/prayers"
								>
									<ArrowLeftIcon className="size-3.5" />
									Back to Prayers
								</Link>
								<h2 className="mt-3 font-serif text-xl">Prayer Details</h2>
								<FieldGroup className="mt-2 gap-3">
									<Field>
										<FieldLabel htmlFor="prayer-title">Prayer title</FieldLabel>
										<Input
											className="h-8 rounded-md"
											id="prayer-title"
											onChange={(event) => setTitle(event.target.value)}
											value={title}
										/>
									</Field>
									<Field>
										<FieldLabel>Prayer body</FieldLabel>
										<RichTextEditor
											ariaLabel="Prayer body"
											contentClassName="[&_.ProseMirror]:min-h-44 [&_.ProseMirror]:px-5 [&_.ProseMirror]:py-3"
											footer={
												<div className="flex justify-end px-3 py-1.5 text-[10px] text-muted-foreground">
													{getWordCount(content)} words
												</div>
											}
											onChange={setContent}
											placeholder="Write your prayer…"
											value={content}
										/>
									</Field>
									<Field>
										<FieldLabel>Visibility</FieldLabel>
										<ToggleGroup
											className="grid w-full grid-cols-2 gap-2"
											onValueChange={(value) => {
												if (value) setVisibility(value);
											}}
											type="single"
											value={visibility}
										>
											<ToggleGroupItem
												className="h-auto justify-start rounded-lg border px-3 py-2 text-left data-pressed:border-primary data-pressed:bg-primary/5"
												value="private"
											>
												<LockIcon className="size-4" data-icon="inline-start" />
												<span>
													<span className="block font-medium">Private</span>
													<span className="block font-normal text-[10px] text-muted-foreground">
														Only you can see this prayer
													</span>
												</span>
											</ToggleGroupItem>
											<ToggleGroupItem
												className="h-auto justify-start rounded-lg border px-3 py-2 text-left data-pressed:border-primary data-pressed:bg-primary/5"
												value="public"
											>
												<UsersRoundIcon
													className="size-4"
													data-icon="inline-start"
												/>
												<span>
													<span className="block font-medium">Public</span>
													<span className="block font-normal text-[10px] text-muted-foreground">
														Others in the community can see this
													</span>
												</span>
											</ToggleGroupItem>
										</ToggleGroup>
										<FieldDescription>
											Choose who can view this prayer. You can reflect on it
											later.
										</FieldDescription>
									</Field>
									<Field>
										<FieldLabel>
											Category{" "}
											<span className="font-normal text-muted-foreground">
												(optional)
											</span>
										</FieldLabel>
										<ToggleGroup
											className="flex w-full flex-wrap gap-2"
											onValueChange={(value) => {
												if (value) setCategory(value);
											}}
											type="single"
											value={category}
										>
											{[
												"Guidance",
												"Family",
												"Healing",
												"Work",
												"Thanksgiving",
											].map((item) => (
												<ToggleGroupItem
													className="h-6 rounded-full bg-muted px-4 text-[11px] data-pressed:bg-primary/10 data-pressed:text-primary"
													key={item}
													value={item}
												>
													{item}
												</ToggleGroupItem>
											))}
											<Button
												className="h-6 rounded-full px-3 text-[11px]"
												size="xs"
												type="button"
												variant="outline"
											>
												<PlusIcon data-icon="inline-start" />
												Add custom
											</Button>
										</ToggleGroup>
									</Field>
									<Field>
										<FieldLabel htmlFor="scripture">
											Related Scripture{" "}
											<span className="font-normal text-muted-foreground">
												(optional)
											</span>
										</FieldLabel>
										<div className="relative">
											<SearchIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
											<Input
												className="h-8 rounded-md pl-8"
												id="scripture"
												placeholder="Search for a passage (e.g. John 3:16, Psalm 23, faith...)"
											/>
										</div>
									</Field>
								</FieldGroup>
								<div className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-xs">
									<div className="flex items-start gap-2">
										<BookOpenIcon className="mt-0.5 size-4 text-primary" />
										<div>
											<p className="font-medium">Proverbs 3:5–6</p>
											<p className="text-[10px] text-muted-foreground leading-3">
												Trust in the Lord with all your heart, and lean not on
												your own understanding; in all your ways acknowledge
												him, and he will make your paths straight.
											</p>
										</div>
									</div>
								</div>
								<div className="mt-2 flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs">
									<BookOpenIcon className="mt-0.5 size-4 text-primary" />
									<div>
										<p className="font-medium">Future reflection</p>
										<p className="text-[10px] text-muted-foreground">
											After saving this prayer, you can return later to add
											reflections on how God has worked through it.
										</p>
									</div>
								</div>
								<div className="mt-3 flex justify-between gap-2">
									<Button
										className="rounded-lg"
										render={<Link to="/library/prayers" />}
										size="sm"
										variant="outline"
									>
										Cancel
									</Button>
									<div className="flex gap-2">
										<Button
											className="rounded-lg"
											size="sm"
											type="button"
											variant="outline"
										>
											Save Draft
										</Button>
										<Button className="rounded-lg px-5" size="sm" type="submit">
											<PlusIcon data-icon="inline-start" />
											Save Prayer
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					</form>
					<PrayerPreview
						category={category}
						content={content}
						title={title}
						visibility={visibility}
					/>
				</div>
			</main>
		</div>
	);
}

function NewPrayerBenefits() {
	const benefits = [
		{
			icon: LockIcon,
			title: "Private by default",
			copy: "Your prayers are private unless you choose to share them.",
		},
		{
			icon: LeafIcon,
			title: "Linked to study",
			copy: "Attach Scripture to keep your prayers rooted in God’s Word.",
		},
		{
			icon: Clock3Icon,
			title: "Reflections later",
			copy: "Return anytime to add reflections and see how God has worked.",
		},
	];
	return (
		<section className="grid gap-3 md:grid-cols-3" aria-label="Prayer features">
			{benefits.map(({ icon: Icon, title, copy }) => (
				<Card
					className="flex-row items-center gap-3 rounded-xl px-4 py-2.5 shadow-sm ring-foreground/8"
					key={title}
				>
					<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/8 text-primary">
						<Icon className="size-5" />
					</div>
					<div>
						<h2 className="font-serif text-sm">{title}</h2>
						<p className="text-[11px] text-muted-foreground leading-3">
							{copy}
						</p>
					</div>
				</Card>
			))}
		</section>
	);
}

function PrayerPreview({
	category,
	content,
	title,
	visibility,
}: {
	category: string;
	content: RichTextDocument;
	title: string;
	visibility: string;
}) {
	const text =
		content.content
			?.flatMap((node) => node.content?.map((child) => child.text ?? "") ?? [])
			.filter(Boolean) ?? [];
	return (
		<aside>
			<Card className="gap-0 rounded-xl py-2 shadow-sm ring-foreground/8 xl:sticky xl:top-6">
				<CardContent className="px-2">
					<div className="h-27 rounded-lg bg-[url('/landing/cta-hills.png')] bg-center bg-cover" />
					<div className="px-3 pt-2">
						<p className="flex items-center gap-1 text-muted-foreground text-xs">
							<EyeIcon className="size-3" /> Preview{" "}
							<span className="ml-auto text-[10px]">
								This is how your prayer will appear
							</span>
						</p>
						<h2 className="mt-1 font-serif text-2xl leading-7">
							{title || "Untitled prayer"}
						</h2>
						<div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
							<span>April 24, 2025</span>
							<Badge className="rounded-full" variant="outline">
								<LockIcon className="size-3" />
								{visibility === "private" ? "Private" : "Public"}
							</Badge>
						</div>
						<Badge
							className="mt-2 rounded-full bg-primary/10 text-primary"
							variant="secondary"
						>
							{category}
						</Badge>
						<div className="mt-3 flex flex-col gap-2 text-sm leading-4">
							{text.map((paragraph, index) => (
								<p key={`${paragraph}-${index}`}>{paragraph}</p>
							))}
						</div>
						<PreviewSection icon={BookOpenIcon} title="Related Scripture">
							<p className="font-medium">Proverbs 3:5–6</p>
							<p>
								Trust in the Lord with all your heart, and lean not on your own
								understanding; in all your ways acknowledge him, and he will
								make your paths straight.
							</p>
						</PreviewSection>
						<PreviewSection icon={Clock3Icon} title="Reflection reminder">
							<p>Reflections can be added later as you revisit this prayer.</p>
						</PreviewSection>
						<Separator className="my-4" />
						<p className="text-center font-serif text-muted-foreground text-xs italic">
							Keep it simple. Write honestly. Return later to reflect.
							<br />
							God sees your heart, and He is always near.
						</p>
					</div>
				</CardContent>
			</Card>
		</aside>
	);
}

function PreviewSection({
	children,
	icon: Icon,
	title,
}: {
	children: React.ReactNode;
	icon: typeof BookOpenIcon;
	title: string;
}) {
	return (
		<section className="mt-3 rounded-lg bg-muted/60 p-3 text-muted-foreground text-xs">
			<h3 className="flex items-center gap-2 font-medium text-foreground">
				<Icon className="size-4 text-primary" />
				{title}
			</h3>
			<div className="mt-1 leading-3">{children}</div>
		</section>
	);
}
