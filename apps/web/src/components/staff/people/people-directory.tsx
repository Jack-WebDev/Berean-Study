import { Input } from "@berean-study/ui/components/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@berean-study/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

import { formatStaffDate } from "@/lib/format";
import { peopleListQueryOptions } from "@/queries/people";

import { StaffButton } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StaffPagination } from "../staff-pagination";
import { AccountStatusChip, RoleChips } from "./person-chips";

export type PeopleSearch = { page?: number; q?: string };

/** The searchable list behind both the Users and the Contributors pages. */
export function PeopleDirectory({
	filters,
	onSearch,
	pageLink,
	toolbar,
}: {
	filters: { page: number; query?: string; staffOnly?: boolean };
	onSearch: (query: string) => void;
	pageLink: (page: number, label: string) => ReactNode;
	toolbar?: ReactNode;
}) {
	const { data, isError, isPending } = useQuery(
		peopleListQueryOptions(filters),
	);

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const query = new FormData(event.currentTarget).get("query");
		onSearch(typeof query === "string" ? query : "");
	}

	return (
		<StaffCard className="p-0 sm:p-0">
			<div className="flex flex-wrap items-center gap-3 border-border-subtle border-b p-4">
				<form className="flex min-w-0 flex-1 basis-64 gap-2" onSubmit={submit}>
					<Input
						aria-label="Search by name or email"
						className="h-11 min-w-0 flex-1 rounded-[0.625rem] text-sm"
						defaultValue={filters.query}
						key={filters.query}
						name="query"
						placeholder="Search by name or email"
						type="search"
					/>
					<StaffButton aria-label="Search" type="submit" variant="outline">
						<SearchIcon aria-hidden="true" />
					</StaffButton>
				</form>
				{toolbar}
			</div>

			{isPending ? (
				<p className="p-6 text-muted-foreground text-sm">Loading people…</p>
			) : isError ? (
				<p className="p-6 text-destructive text-sm" role="alert">
					This list didn't load. Reload the page to try again.
				</p>
			) : data.people.length === 0 ? (
				<p className="p-6 text-muted-foreground text-sm">
					{filters.query
						? `Nobody matches "${filters.query}". Check the spelling or search by email.`
						: "Nobody here yet."}
				</p>
			) : (
				<div className="overflow-x-auto">
					<Table className="min-w-[44rem]">
						<TableHeader>
							<TableRow>
								<TableHead className="pl-5">Name</TableHead>
								<TableHead>Roles</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="pr-5">Joined</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.people.map((person) => (
								<TableRow key={person.id}>
									<TableCell className="py-3 pl-5">
										<Link
											className="font-medium text-sm underline-offset-4 hover:underline"
											params={{ userId: person.id }}
											to="/admin/users/$userId"
										>
											{person.name}
										</Link>
										{person.status === "deleted" ? null : (
											<p className="text-muted-foreground text-xs">
												{person.email}
											</p>
										)}
									</TableCell>
									<TableCell>
										<RoleChips roles={person.roles} />
									</TableCell>
									<TableCell>
										<AccountStatusChip status={person.status} />
									</TableCell>
									<TableCell className="pr-5 text-muted-foreground text-sm">
										{formatStaffDate(person.createdAt)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{data ? (
				<div className="px-4 pb-4">
					<StaffPagination
						next={pageLink(filters.page + 1, "Next")}
						page={filters.page}
						pageSize={data.pageSize}
						previous={pageLink(filters.page - 1, "Previous")}
						total={data.total}
					/>
				</div>
			) : null}
		</StaffCard>
	);
}
