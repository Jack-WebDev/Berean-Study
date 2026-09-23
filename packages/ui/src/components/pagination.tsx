import { cn } from "cn";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	MoreHorizontalIcon,
} from "lucide-react";
import type * as React from "react";
import { Button } from "./button";
import { NativeSelect, NativeSelectOption } from "./native-select";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
	return (
		<nav
			aria-label="pagination"
			data-slot="pagination"
			className={cn("mx-auto flex w-full justify-center", className)}
			{...props}
		/>
	);
}

function PaginationContent({
	className,
	...props
}: React.ComponentProps<"ul">) {
	return (
		<ul
			data-slot="pagination-content"
			className={cn("flex items-center gap-0.5", className)}
			{...props}
		/>
	);
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
	return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
	isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
	React.ComponentProps<"a">;

function PaginationLink({
	className,
	isActive,
	size = "icon",
	...props
}: PaginationLinkProps) {
	return (
		<Button
			variant={isActive ? "outline" : "ghost"}
			size={size}
			className={cn(className)}
			nativeButton={false}
			render={
				<a
					aria-current={isActive ? "page" : undefined}
					data-slot="pagination-link"
					data-active={isActive}
					{...props}
				/>
			}
		/>
	);
}

function PaginationPrevious({
	className,
	text = "Previous",
	...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
	return (
		<PaginationLink
			aria-label="Go to previous page"
			className={cn("pl-1.5!", className)}
			{...props}
		>
			<ChevronLeftIcon data-icon="inline-start" />
			<span className="hidden sm:block">{text}</span>
		</PaginationLink>
	);
}

function PaginationNext({
	className,
	text = "Next",
	...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
	return (
		<PaginationLink
			aria-label="Go to next page"
			className={cn("pr-1.5!", className)}
			{...props}
		>
			<span className="hidden sm:block">{text}</span>
			<ChevronRightIcon data-icon="inline-end" />
		</PaginationLink>
	);
}

function PaginationEllipsis({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			aria-hidden
			data-slot="pagination-ellipsis"
			className={cn(
				"flex size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		>
			<MoreHorizontalIcon />
			<span className="sr-only">More pages</span>
		</span>
	);
}

type DataPaginationProps = {
	className?: string;
	onPageChange: (page: number) => void;
	onPageSizeChange?: (pageSize: number) => void;
	page: number;
	pageSize: number;
	pageSizeOptions?: readonly number[];
	total: number;
};

/** Controlled pagination for paged result sets. */
function DataPagination({
	className,
	onPageChange,
	onPageSizeChange,
	page,
	pageSize,
	pageSizeOptions = [10, 20, 50],
	total,
}: DataPaginationProps) {
	if (total === 0) return null;

	const pageCount = Math.ceil(total / pageSize);
	const visiblePages = getVisiblePages(page, pageCount);
	const rangeStart = (page - 1) * pageSize + 1;
	const rangeEnd = Math.min(page * pageSize, total);

	return (
		<div
			className={cn(
				"flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between",
				className,
			)}
		>
			<nav aria-label="Pagination">
				<ul className="flex items-center gap-2">
					<li>
						<Button
							aria-label="Go to previous page"
							className="size-10 rounded-xl sm:size-12"
							disabled={page === 1}
							onClick={() => onPageChange(page - 1)}
							size="icon"
							type="button"
							variant="outline"
						>
							<ChevronLeftIcon />
						</Button>
					</li>
					{visiblePages.map((item, index) =>
						item === "ellipsis" ? (
							<li key={`ellipsis-${index}`}>
								<PaginationEllipsis className="size-10 sm:size-12" />
							</li>
						) : (
							<li key={item}>
								<Button
									aria-current={item === page ? "page" : undefined}
									aria-label={`Go to page ${item}`}
									className="size-10 rounded-xl text-base sm:size-12"
									onClick={() => onPageChange(item)}
									size="icon"
									type="button"
									variant={item === page ? "default" : "outline"}
								>
									{item}
								</Button>
							</li>
						),
					)}
					<li>
						<Button
							aria-label="Go to next page"
							className="size-10 rounded-xl sm:size-12"
							disabled={page === pageCount}
							onClick={() => onPageChange(page + 1)}
							size="icon"
							type="button"
							variant="outline"
						>
							<ChevronRightIcon />
						</Button>
					</li>
				</ul>
			</nav>
			<div className="flex items-center justify-between gap-4 sm:justify-end">
				<p className="font-medium text-lg sm:text-xl">
					Results: {rangeStart} – {rangeEnd} of {total}
				</p>
				{onPageSizeChange ? (
					<label className="sr-only" htmlFor="pagination-page-size">
						Results per page
					</label>
				) : null}
				{onPageSizeChange ? (
					<NativeSelect
						className="w-24"
						id="pagination-page-size"
						onChange={(event) => onPageSizeChange(Number(event.target.value))}
						value={pageSize}
					>
						{pageSizeOptions.map((option) => (
							<NativeSelectOption key={option} value={option}>
								{option}
							</NativeSelectOption>
						))}
					</NativeSelect>
				) : null}
			</div>
		</div>
	);
}

function getVisiblePages(page: number, pageCount: number) {
	if (pageCount <= 5)
		return Array.from({ length: pageCount }, (_, index) => index + 1);
	if (page <= 3) return [1, 2, 3, "ellipsis", pageCount] as const;
	if (page >= pageCount - 2)
		return [1, "ellipsis", pageCount - 2, pageCount - 1, pageCount] as const;
	return [
		1,
		"ellipsis",
		page - 1,
		page,
		page + 1,
		"ellipsis",
		pageCount,
	] as const;
}

export {
	DataPagination,
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
};
