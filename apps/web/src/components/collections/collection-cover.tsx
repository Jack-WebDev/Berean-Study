"use client";

import { ImageOffIcon } from "lucide-react";
import { useState } from "react";

export function CollectionCover({
	alt = "",
	className,
	src,
}: {
	alt?: string;
	className: string;
	src: string;
}) {
	const [hasLoadError, setHasLoadError] = useState(false);

	if (hasLoadError) {
		if (alt) {
			return (
				<div
					aria-label={`${alt} unavailable`}
					className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}
					role="img"
				>
					<ImageOffIcon aria-hidden="true" />
				</div>
			);
		}

		return (
			<div
				aria-hidden="true"
				className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}
			>
				<ImageOffIcon aria-hidden="true" />
			</div>
		);
	}

	return (
		<img
			alt={alt}
			className={className}
			onError={() => setHasLoadError(true)}
			src={src}
		/>
	);
}
