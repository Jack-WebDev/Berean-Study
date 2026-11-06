import type { StaffQueue } from "@berean-study/db/staff-queues";
import { cn } from "@berean-study/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";

import { staffQueueCountsQueryOptions } from "@/queries/staff-queues";

/** How many items wait in a staff queue. Shows nothing when the queue is empty. */
export function NavigationQueueCount({
	className,
	queue,
}: {
	className?: string;
	queue: StaffQueue;
}) {
	const { data: waiting } = useQuery({
		...staffQueueCountsQueryOptions(),
		select: (counts) => counts[queue],
	});

	if (!waiting) return null;

	return (
		<span
			className={cn(
				"inline-flex h-5 min-w-5.5 shrink-0 items-center justify-center rounded-full bg-queue-count px-1.75 font-bold text-[0.6875rem] text-queue-count-foreground tabular-nums",
				className,
			)}
		>
			{waiting}
			<span className="sr-only"> waiting</span>
		</span>
	);
}
