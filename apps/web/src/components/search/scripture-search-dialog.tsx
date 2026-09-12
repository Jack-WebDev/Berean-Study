import { Button } from "@berean-study/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@berean-study/ui/components/dialog";
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@berean-study/ui/components/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@berean-study/ui/components/input-group";
import { SearchIcon } from "lucide-react";

export function ScriptureSearchDialog() {
	return (
		<Dialog>
			<DialogTrigger render={<Button size="sm" variant="ghost" />}>
				<SearchIcon data-icon="inline-start" />
				Search Scripture
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Search Scripture</DialogTitle>
					<DialogDescription>
						Search by passage reference, word, or phrase.
					</DialogDescription>
				</DialogHeader>
				<form action="/search" className="flex flex-col gap-4" method="get">
					<FieldGroup>
						<Field>
							<FieldLabel className="sr-only" htmlFor="scripture-search">
								Search Scripture
							</FieldLabel>
							<InputGroup>
								<InputGroupAddon>
									<SearchIcon aria-hidden="true" />
								</InputGroupAddon>
								<InputGroupInput
									autoFocus
									id="scripture-search"
									name="q"
									placeholder="e.g. John 3:16"
								/>
							</InputGroup>
						</Field>
					</FieldGroup>
					<Button className="self-end" type="submit">
						Search
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
