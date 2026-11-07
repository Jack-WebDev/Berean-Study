import { Button, buttonVariants } from "@berean-study/ui/components/button";
import { cn } from "@berean-study/ui/lib/utils";
import type { ComponentProps } from "react";

const staffButtonSize = "h-11 rounded-[0.625rem] px-4 text-sm";

/** The same look for a real link, so it stays a link to keyboards and screen readers. */
export const staffLinkClassName = cn(
	buttonVariants({ variant: "outline" }),
	staffButtonSize,
);

/** The same, for the one main action on a screen. */
export const staffPrimaryLinkClassName = cn(buttonVariants(), staffButtonSize);

/** Staff screens use larger buttons than the base size, so they're easy to tap. */
export function StaffButton({
	className,
	...props
}: ComponentProps<typeof Button>) {
	return <Button className={cn(staffButtonSize, className)} {...props} />;
}
