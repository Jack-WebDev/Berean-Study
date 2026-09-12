import { Button } from "@berean-study/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@berean-study/ui/components/field";
import { Input } from "@berean-study/ui/components/input";
import { Separator } from "@berean-study/ui/components/separator";
import { LockKeyholeIcon } from "lucide-react";
import type { FormEvent } from "react";

import type { ProfileUser } from "./types";

type PersonalInformationFormProps = {
	user: ProfileUser;
	name: string;
	error: string | null;
	isDirty: boolean;
	isSaving: boolean;
	onNameChange: (value: string) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function PersonalInformationForm({
	user,
	name,
	error,
	isDirty,
	isSaving,
	onNameChange,
	onSubmit,
}: PersonalInformationFormProps) {
	return (
		<section className="rounded-2xl border border-border/60 bg-card px-6 py-6 shadow-sm sm:px-8">
			<header>
				<h2 className="font-serif text-xl tracking-[-0.015em]">
					Personal Information
				</h2>
				<p className="mt-1 text-muted-foreground text-sm">
					Update the details associated with your account.
				</p>
			</header>
			<form className="mt-7" onSubmit={onSubmit}>
				<FieldGroup className="gap-5">
					<Field data-invalid={Boolean(error)}>
						<FieldLabel
							htmlFor="full-name"
							className="font-medium text-foreground text-sm"
						>
							Full name
						</FieldLabel>
						<Input
							aria-describedby={error ? "full-name-error" : undefined}
							aria-invalid={Boolean(error)}
							autoComplete="name"
							className="h-11 rounded-lg border-border/70 bg-background px-3 shadow-none"
							id="full-name"
							name="name"
							onChange={(event) => onNameChange(event.target.value)}
							value={name}
						/>
						<FieldError id="full-name-error">{error}</FieldError>
					</Field>
					<Field>
						<FieldLabel
							htmlFor="email-address"
							className="font-medium text-foreground text-sm"
						>
							Email address
						</FieldLabel>
						<div className="relative">
							<Input
								aria-readonly="true"
								className="h-11 rounded-lg border-border/60 bg-muted/25 pr-10 text-muted-foreground shadow-none"
								id="email-address"
								readOnly
								value={user.email}
							/>
							<LockKeyholeIcon
								aria-hidden="true"
								className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
							/>
						</div>
						<FieldDescription>
							Email changes are not available for this account.
						</FieldDescription>
					</Field>
				</FieldGroup>
				<Separator className="my-6" />
				<div className="flex justify-end">
					<Button
						className="h-10 rounded-lg px-5 font-medium"
						disabled={!isDirty || isSaving}
						type="submit"
					>
						{isSaving ? "Saving changes…" : "Save changes"}
					</Button>
				</div>
			</form>
		</section>
	);
}
