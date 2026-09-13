import { cn } from "@berean-study/ui/lib/utils";
import { CheckIcon } from "lucide-react";

type PasswordStrength = {
	label: "Weak" | "Fair" | "Good" | "Strong";
	score: number;
	textClassName: string;
	trackClassName: string;
};

export const minimumPasswordLength = 12;

const strengthByScore: PasswordStrength[] = [
	{
		label: "Weak",
		score: 1,
		textClassName: "text-destructive",
		trackClassName: "bg-destructive",
	},
	{
		label: "Fair",
		score: 2,
		textClassName: "text-amber-700 dark:text-amber-400",
		trackClassName: "bg-amber-500",
	},
	{
		label: "Good",
		score: 3,
		textClassName: "text-primary",
		trackClassName: "bg-primary",
	},
	{
		label: "Strong",
		score: 4,
		textClassName: "text-emerald-700 dark:text-emerald-400",
		trackClassName: "bg-emerald-600 dark:bg-emerald-500",
	},
];

export function getPasswordStrength(password: string): PasswordStrength {
	if (password.length < minimumPasswordLength) return strengthByScore[0];

	const score = [
		true,
		true,
		/[a-z]/.test(password) && /[A-Z]/.test(password),
		/\d/.test(password),
		/[^A-Za-z0-9]/.test(password),
	].filter(Boolean).length;

	return (
		strengthByScore[Math.max(0, Math.min(score, 4) - 1)] ?? strengthByScore[0]
	);
}

export function isWeakPassword(password: string) {
	return getPasswordStrength(password).label === "Weak";
}

export function PasswordStrengthIndicator({ password }: { password: string }) {
	if (!password) return null;

	const strength = getPasswordStrength(password);
	const requirements = [
		{
			complete: password.length >= minimumPasswordLength,
			label: "12+ characters",
		},
		{
			complete: /[a-z]/.test(password) && /[A-Z]/.test(password),
			label: "Upper & lowercase",
		},
		{ complete: /\d/.test(password), label: "A number" },
		{ complete: /[^A-Za-z0-9]/.test(password), label: "A symbol" },
	];

	return (
		<div aria-live="polite" className="mt-3 space-y-2.5">
			<div className="flex items-center justify-between text-xs">
				<span className="text-muted-foreground">Password strength</span>
				<span className={cn("font-medium", strength.textClassName)}>
					{strength.label}
				</span>
			</div>
			<div
				aria-label={`Password strength: ${strength.label}`}
				className="grid grid-cols-4 gap-1"
				role="progressbar"
				aria-valuemax={4}
				aria-valuemin={0}
				aria-valuenow={strength.score}
			>
				{strengthByScore.map((segment) => (
					<span
						className={cn(
							"h-1.5 rounded-full bg-muted transition-colors",
							segment.score <= strength.score && strength.trackClassName,
						)}
						key={segment.score}
					/>
				))}
			</div>
			<ul className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground text-xs">
				{requirements.map((requirement) => (
					<li
						className={cn(
							"flex items-center gap-1",
							requirement.complete && "text-foreground",
						)}
						key={requirement.label}
					>
						<CheckIcon
							aria-hidden="true"
							className={cn(
								"size-3 text-muted-foreground/50",
								requirement.complete && strength.textClassName,
							)}
						/>
						{requirement.label}
					</li>
				))}
			</ul>
		</div>
	);
}
