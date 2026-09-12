import { Separator } from "@berean-study/ui/components/separator";
import { Skeleton } from "@berean-study/ui/components/skeleton";

export function ProfileSkeleton() {
	return (
		<div
			aria-label="Loading profile"
			className="grid w-full gap-5 min-[900px]:grid-cols-[minmax(0,1fr)_16rem]"
			role="status"
		>
			<div className="flex flex-col gap-5">
				<ProfileIdentitySkeleton />
				<PersonalInformationSkeleton />
			</div>
			<div className="flex flex-col gap-5">
				<Skeleton className="h-72 rounded-2xl" />
				<Skeleton className="h-70 rounded-2xl" />
			</div>
		</div>
	);
}

function ProfileIdentitySkeleton() {
	return (
		<div className="rounded-2xl border border-border/60 p-8">
			<div className="flex items-center gap-5">
				<Skeleton className="size-22 rounded-full" />
				<div className="flex flex-col gap-2">
					<Skeleton className="h-6 w-36" />
					<Skeleton className="h-4 w-48" />
					<Skeleton className="h-3 w-28" />
				</div>
			</div>
			<Separator className="my-6" />
			<Skeleton className="h-4 w-80" />
			<Skeleton className="mt-2 h-3 w-24" />
		</div>
	);
}

function PersonalInformationSkeleton() {
	return (
		<div className="rounded-2xl border border-border/60 p-8">
			<Skeleton className="h-6 w-44" />
			<Skeleton className="mt-2 h-4 w-64" />
			<div className="mt-7 flex flex-col gap-5">
				<Skeleton className="h-11 w-full rounded-lg" />
				<Skeleton className="h-11 w-full rounded-lg" />
			</div>
		</div>
	);
}
