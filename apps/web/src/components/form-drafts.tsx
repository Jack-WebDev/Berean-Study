import {
	createContext,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useContext,
	useMemo,
	useState,
} from "react";
import type { Tradition, Translation } from "./account/preferences/types";
import type { ReadingSettings } from "./account/reading/types";

export type FormDraftSchema = {
	"account.preferences.tradition": Tradition;
	"account.preferences.translation": Translation;
	"account.profile.name": string;
	"account.reading.settings": ReadingSettings;
	"auth.forgot-password": { email: string };
	"auth.login": { email: string; password: string };
	"auth.register": { email: string; name: string; password: string };
	"auth.reset-password": {
		confirmPassword: string;
		otp: string;
		password: string;
	};
	"auth.two-factor": { code: string };
	"auth.verify-email": { code: string };
};

type FormDraftsContextValue = {
	drafts: Partial<FormDraftSchema>;
	setDrafts: Dispatch<SetStateAction<Partial<FormDraftSchema>>>;
};

const FormDraftsContext = createContext<FormDraftsContextValue | null>(null);

/**
 * Holds unsaved form values in memory for the lifetime of the application.
 * Use a namespaced key (for example, "account.profile.name") to avoid
 * collisions between features.
 */
export function FormDraftsProvider({ children }: { children: ReactNode }) {
	const [drafts, setDrafts] = useState<Partial<FormDraftSchema>>({});
	const value = useMemo(() => ({ drafts, setDrafts }), [drafts]);

	return (
		<FormDraftsContext.Provider value={value}>
			{children}
		</FormDraftsContext.Provider>
	);
}

export function useFormDraft<Key extends keyof FormDraftSchema>(
	key: Key,
	initialValue: FormDraftSchema[Key],
) {
	const context = useContext(FormDraftsContext);

	if (!context) {
		throw new Error("useFormDraft must be used within FormDraftsProvider.");
	}

	const value = context.drafts[key] ?? initialValue;
	const setValue: Dispatch<SetStateAction<FormDraftSchema[Key]>> = (
		nextValue,
	) => {
		context.setDrafts((currentDrafts) => {
			const currentValue = currentDrafts[key] ?? initialValue;
			const resolvedValue =
				typeof nextValue === "function"
					? (
							nextValue as (value: FormDraftSchema[Key]) => FormDraftSchema[Key]
						)(currentValue)
					: nextValue;

			return { ...currentDrafts, [key]: resolvedValue };
		});
	};

	return [value, setValue] as const;
}
