import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@berean-study/ui/components/alert";
import { Badge } from "@berean-study/ui/components/badge";
import { Button } from "@berean-study/ui/components/button";
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@berean-study/ui/components/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@berean-study/ui/components/input-group";
import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";

import type { NoteTag } from "./types";

export function NoteTags({
	onAdd,
	onRemove,
	tags,
}: {
	onAdd: (name: string) => Promise<void>;
	onRemove: (tagId: number) => Promise<void>;
	tags: NoteTag[];
}) {
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isAdding, setIsAdding] = useState(false);
	const [removingTagId, setRemovingTagId] = useState<number | null>(null);

	return (
		<section
			aria-labelledby="note-tags-heading"
			className="flex flex-col gap-3"
		>
			<div>
				<h2 className="font-medium text-sm" id="note-tags-heading">
					Tags
				</h2>
				<p className="mt-1 text-muted-foreground text-xs">
					Private labels for organizing your study.
				</p>
			</div>
			{tags.length > 0 ? (
				<ul className="flex flex-wrap gap-2">
					{tags.map((tag) => (
						<li className="flex items-center bg-secondary" key={tag.id}>
							<Badge variant="secondary">{tag.name}</Badge>
							<Button
								aria-label={`Remove ${tag.name} tag`}
								disabled={removingTagId === tag.id}
								onClick={() => {
									setError(null);
									setRemovingTagId(tag.id);
									void onRemove(tag.id)
										.catch(() =>
											setError("Unable to remove this tag. Please try again."),
										)
										.finally(() => setRemovingTagId(null));
								}}
								size="icon-xs"
								type="button"
								variant="ghost"
							>
								<XIcon aria-hidden="true" />
							</Button>
						</li>
					))}
				</ul>
			) : null}
			<form
				onSubmit={(event) => {
					event.preventDefault();
					const nextName = name.trim();
					if (!nextName) return;

					setError(null);
					setIsAdding(true);
					void onAdd(nextName)
						.then(() => setName(""))
						.catch(() => setError("Unable to add this tag. Please try again."))
						.finally(() => setIsAdding(false));
				}}
			>
				<FieldGroup>
					<Field>
						<FieldLabel className="sr-only" htmlFor="new-note-tag">
							Add a tag
						</FieldLabel>
						<InputGroup>
							<InputGroupInput
								disabled={isAdding}
								id="new-note-tag"
								maxLength={50}
								onChange={(event) => setName(event.target.value)}
								placeholder="Add a tag"
								value={name}
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupButton
									disabled={isAdding || !name.trim()}
									type="submit"
									variant="outline"
								>
									<PlusIcon aria-hidden="true" data-icon="inline-start" />
									Add
								</InputGroupButton>
							</InputGroupAddon>
						</InputGroup>
					</Field>
				</FieldGroup>
			</form>
			{error ? (
				<Alert variant="destructive">
					<AlertTitle>Unable to update tags</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}
		</section>
	);
}
