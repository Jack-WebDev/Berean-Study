import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import { PersonalInformationForm } from "./personal-information-form";
import { ProfileIdentity } from "./profile-identity";
import { ProfileSkeleton } from "./profile-skeleton";
import { ScriptureCard, StudyJourney } from "./study-journey";
import type { ProfileUser } from "./types";

export function ProfilePage() {
	const { data: session, isPending } = authClient.useSession();

	return isPending || !session ? (
		<ProfileSkeleton />
	) : (
		<ProfileContent
			key={`${session.user.id}:${session.user.name}`}
			user={session.user}
		/>
	);
}

function ProfileContent({ user }: { user: ProfileUser }) {
	const [name, setName] = useState(user.name);
	const [savedName, setSavedName] = useState(user.name);
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const normalizedName = name.trim();
	const isDirty = normalizedName !== savedName;

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!isDirty || isSaving) return;

		if (normalizedName.length < 2) {
			setError("Enter a name with at least 2 characters.");
			return;
		}

		setError(null);
		setIsSaving(true);
		const { error: updateError } = await authClient.updateUser({
			name: normalizedName,
		});
		setIsSaving(false);

		if (updateError) {
			setError(
				updateError.message ||
					updateError.statusText ||
					"Unable to save your changes.",
			);
			return;
		}

		setName(normalizedName);
		setSavedName(normalizedName);
		toast.success("Changes saved.");
	}

	function handleNameChange(value: string) {
		setName(value);
		if (error) setError(null);
	}

	return (
		<div className="grid w-full gap-5 min-[900px]:grid-cols-[minmax(0,1fr)_16rem]">
			<main className="flex min-w-0 flex-col gap-5">
				<ProfileIdentity user={user} />
				<PersonalInformationForm
					error={error}
					isDirty={isDirty}
					isSaving={isSaving}
					name={name}
					onNameChange={handleNameChange}
					onSubmit={handleSubmit}
					user={user}
				/>
			</main>
			<aside className="flex flex-col gap-5">
				<StudyJourney />
				<ScriptureCard />
			</aside>
		</div>
	);
}
