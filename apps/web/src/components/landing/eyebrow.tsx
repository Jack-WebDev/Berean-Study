export function Eyebrow({ children }: { children: string }) {
	return (
		<p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.22em]">
			{children}
		</p>
	);
}
