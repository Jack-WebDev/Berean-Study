/** biome-ignore-all lint/a11y/noLabelWithoutControl: biome-ignore lint: false positive */
"use client";

import { cn } from "cn";
import type * as React from "react";

type LabelProps = React.ComponentProps<"label"> & {
	htmlFor?: string;
};

function Label({ className, htmlFor, ...props }: LabelProps) {
	return (
		<label
			data-slot="label"
			htmlFor={htmlFor}
			className={cn(
				"flex select-none items-center gap-2 text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}

export { Label };
