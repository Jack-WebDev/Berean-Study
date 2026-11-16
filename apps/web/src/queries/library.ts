import { queryOptions } from "@tanstack/react-query";

import {
	getLibraryDestinationCounts,
	getLibraryReadingState,
	getRecentLibraryActivity,
	getRecentlyStudied,
} from "@/functions/get-library-overview";
import { getReaderHomeOverview } from "@/functions/get-reader-home-overview";
import { getSavedItems } from "@/functions/saved-items";

import { libraryKeys } from "./keys";

export const readerHomeQueryOptions = () =>
	queryOptions({
		queryKey: libraryKeys.home(),
		queryFn: () => getReaderHomeOverview(),
	});

export const libraryReadingStateQueryOptions = () =>
	queryOptions({
		queryKey: libraryKeys.readingState(),
		queryFn: () => getLibraryReadingState(),
	});

export const libraryDestinationCountsQueryOptions = () =>
	queryOptions({
		queryKey: libraryKeys.destinationCounts(),
		queryFn: () => getLibraryDestinationCounts(),
	});

export const recentLibraryActivityQueryOptions = () =>
	queryOptions({
		queryKey: libraryKeys.recentActivity(),
		queryFn: () => getRecentLibraryActivity(),
	});

export const recentlyStudiedQueryOptions = () =>
	queryOptions({
		queryKey: libraryKeys.recentlyStudied(),
		queryFn: () => getRecentlyStudied(),
	});

export const savedItemsQueryOptions = () =>
	queryOptions({
		queryKey: libraryKeys.savedItems(),
		queryFn: () => getSavedItems(),
	});
