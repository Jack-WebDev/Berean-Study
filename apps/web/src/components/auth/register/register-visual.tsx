import { FileTextIcon, LibraryIcon, UsersRoundIcon } from "lucide-react";

const features = [
	{
		icon: FileTextIcon,
		title: "Access trusted resources",
		description:
			"Commentaries, multiple viewpoints, and original-language insights.",
	},
	{
		icon: LibraryIcon,
		title: "Save and organize",
		description:
			"Keep notes, highlights, bookmarks, and reading progress together.",
	},
	{
		icon: UsersRoundIcon,
		title: "A thoughtful community",
		description:
			"Built for readers who want to understand Scripture carefully.",
	},
] as const;
export default function RegisterVisual() {
	return (
		<aside className="relative hidden min-h-[44rem] overflow-hidden md:block">
			<img
				src="/auth/auth-register.png"
				alt=""
				className="absolute inset-0 size-full object-cover"
			/>
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/75 to-background/20"
			/>
			<div className="relative z-10 flex h-full max-w-md flex-col justify-center p-10 lg:p-12">
				<p className="font-serif text-4xl leading-[1.05] tracking-[-0.035em]">
					Join a community committed to careful Bible study.
				</p>
				<p className="mt-5 max-w-sm text-muted-foreground text-sm leading-6">
					Create your account to explore Scripture with clarity, context, and
					depth.
				</p>
				<div className="mt-10 flex flex-col gap-6">
					{features.map(({ description, icon: Icon, title }) => (
						<div key={title} className="flex gap-4">
							<div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
								<Icon
									aria-hidden="true"
									className="size-[18px]"
									strokeWidth={1.5}
								/>
							</div>
							<div>
								<p className="font-medium text-sm">{title}</p>
								<p className="mt-1 max-w-xs text-muted-foreground text-xs leading-5">
									{description}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</aside>
	);
}
