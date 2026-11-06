import { queryOptions } from "@tanstack/react-query";

import {
	getBookStructure,
	getScriptureBook,
	listScriptureBooks,
} from "@/functions/scripture-data";
import { getTranslationsOverview } from "@/functions/translations";

import { type BookStructureInput, scriptureDataKeys } from "./keys";

export const scriptureBooksQueryOptions = () =>
	queryOptions({
		queryKey: scriptureDataKeys.books(),
		queryFn: () => listScriptureBooks(),
	});

export const scriptureBookQueryOptions = (slug: string) =>
	queryOptions({
		queryKey: scriptureDataKeys.book(slug),
		queryFn: () => getScriptureBook({ data: { slug } }),
	});

export const bookStructureQueryOptions = (input: BookStructureInput) =>
	queryOptions({
		queryKey: scriptureDataKeys.structure(input),
		queryFn: () => getBookStructure({ data: input }),
	});

export const translationsOverviewQueryOptions = (abbreviation?: string) =>
	queryOptions({
		queryKey: scriptureDataKeys.translations(abbreviation),
		queryFn: () => getTranslationsOverview({ data: { abbreviation } }),
	});
