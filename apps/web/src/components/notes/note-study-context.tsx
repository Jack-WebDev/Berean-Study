import { Badge } from "@berean-study/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@berean-study/ui/components/card";
import { Link } from "@tanstack/react-router";
import {
	BookOpenIcon,
	LightbulbIcon,
	LinkIcon,
	ShapesIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { getPassageStudyContext } from "@/functions/passages";

type StudyContext = Awaited<ReturnType<typeof getPassageStudyContext>>;

const studyPrompts = [
	"What does this text explicitly say?",
	"What is the literary context?",
	"What words or phrases need closer attention?",
	"How does this passage connect to the rest of Scripture?",
	"What questions do I still have?",
];

export function NoteStudyContext({
	compact = false,
	passageId,
}: {
	compact?: boolean;
	passageId: string;
}) {
	const [context, setContext] = useState<StudyContext | undefined>(undefined);

	useEffect(() => {
		const id = Number(passageId);
		if (!Number.isSafeInteger(id) || id <= 0) {
			setContext(undefined);
			return;
		}

		let isCurrent = true;
		setContext(undefined);
		void getPassageStudyContext({ data: { passageId: id } })
			.then((nextContext) => {
				if (isCurrent) setContext(nextContext);
			})
			.catch(() => {
				if (isCurrent) setContext(null);
			});

		return () => {
			isCurrent = false;
		};
	}, [passageId]);

	if (!context) return null;

	return (
		<aside
			aria-label="Study context"
			className={compact ? "note-study-context" : "flex flex-col gap-4"}
		>
			{compact ? null : (
				<Card size="sm">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<BookOpenIcon aria-hidden="true" />
							Linked passage
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Link
							className="font-medium text-primary text-sm hover:underline"
							search={{ passage: context.passage.id }}
							to="/bible"
						>
							{context.passage.label}
						</Link>
					</CardContent>
				</Card>
			)}

			{context.themes.length > 0 ? (
				<Card className={compact ? "note-context-card" : undefined} size="sm">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<ShapesIcon aria-hidden="true" />
							Key themes
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-2">
						{context.themes.map((theme) => (
							<Badge key={theme} variant="secondary">
								{theme}
							</Badge>
						))}
					</CardContent>
				</Card>
			) : null}

			{context.relatedPassages.length > 0 ? (
				<Card className={compact ? "note-context-card" : undefined} size="sm">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<LinkIcon aria-hidden="true" />
							Related passages
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-2">
						{context.relatedPassages.map((relatedPassage) => (
							<Badge
								key={relatedPassage.id}
								render={
									<Link search={{ passage: relatedPassage.id }} to="/bible" />
								}
								variant="outline"
							>
								{relatedPassage.label}
							</Badge>
						))}
					</CardContent>
				</Card>
			) : null}

			{compact ? null : (
				<Card size="sm">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<LightbulbIcon aria-hidden="true" />
							Study prompts
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="flex flex-col gap-2 text-muted-foreground text-xs leading-5">
							{studyPrompts.map((prompt) => (
								<li key={prompt}>{prompt}</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}
		</aside>
	);
}
