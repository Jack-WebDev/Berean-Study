import { queryOptions } from "@tanstack/react-query";

import { getTestimony, listTestimonies } from "@/functions/testimonies";

import { testimonyKeys } from "./keys";

export const testimoniesQueryOptions = () =>
	queryOptions({
		queryKey: testimonyKeys.list(),
		queryFn: () => listTestimonies(),
	});

export const testimonyQueryOptions = (id: number) =>
	queryOptions({
		queryKey: testimonyKeys.detail(id),
		queryFn: () => getTestimony({ data: { id } }),
	});
