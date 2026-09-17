import { sql } from "drizzle-orm";

import * as seeds from "./index";
import { createSeedContext, db } from "./utils";

type Seed = (
	context: ReturnType<typeof createSeedContext>,
	count?: number,
) => Promise<void>;

const orderedSeeds: Seed[] = [
	seeds.seedRoles,
	seeds.seedPermissions,
	seeds.seedRolePermissions,
	seeds.seedAuth,
	seeds.seedUserRoles,
	seeds.seedCanonTraditions,
	seeds.seedVersificationSystems,
	seeds.seedLanguages,
	seeds.seedBooks,
	seeds.seedBiblicalPeople,
	seeds.seedPlaces,
	seeds.seedHistoricalPeriods,
	seeds.seedCreditedPeople,
	seeds.seedEditorialChecklists,
	seeds.seedManuscripts,
	seeds.seedSources,
	seeds.seedThemes,
	seeds.seedClaims,
	seeds.seedContributors,
	seeds.seedChapters,
	seeds.seedTranslations,
	seeds.seedSourceTextEditions,
	seeds.seedLexemes,
	seeds.seedPassages,
	seeds.seedVerses,
	seeds.seedVerseTexts,
	seeds.seedBookAliases,
	seeds.seedBookIntroductions,
	seeds.seedBookIntroductionSections,
	seeds.seedCommentaries,
	seeds.seedCommentarySections,
	seeds.seedContentRevisions,
	seeds.seedPublishedBookIntroductionSections,
	seeds.seedPublishedCommentaries,
	seeds.seedPublishedCommentarySections,
	seeds.seedAuditLog,
	seeds.seedBookmarks,
	seeds.seedCanonBooks,
	seeds.seedCanonicalRelationships,
	seeds.seedCitations,
	seeds.seedClaimSources,
	seeds.seedClaimUsages,
	seeds.seedContentIssues,
	seeds.seedContentIssueComments,
	seeds.seedCrossReferences,
	seeds.seedEditorialAssignments,
	seeds.seedEditorialChecks,
	seeds.seedEditorialReviews,
	seeds.seedEvents,
	seeds.seedEventPassages,
	seeds.seedEventPeople,
	seeds.seedEventPlaces,
	seeds.seedHighlights,
	seeds.seedInterpretiveQuestions,
	seeds.seedInterpretationViews,
	seeds.seedLiteraryUnits,
	seeds.seedCollections,
	seeds.seedNotes,
	seeds.seedPrayers,
	seeds.seedPrayerPassages,
	seeds.seedPrayerReflections,
	seeds.seedTestimonies,
	seeds.seedTestimonyNotes,
	seeds.seedTestimonyPassages,
	seeds.seedTestimonyPrayers,
	seeds.seedCommunityPosts,
	seeds.seedCommunityPostPassages,
	seeds.seedCommunityPostBookmarks,
	seeds.seedCommunityReports,
	seeds.seedOriginalLanguageNotes,
	seeds.seedPassageRanges,
	seeds.seedPersonAliases,
	seeds.seedPersonPassages,
	seeds.seedPersonRelationships,
	seeds.seedPlaceAliases,
	seeds.seedPlacePassages,
	seeds.seedPlaceRelationships,
	seeds.seedPublicationHistory,
	seeds.seedReadingHistory,
	seeds.seedReadingPositions,
	seeds.seedResearchNotes,
	seeds.seedResearchNoteSources,
	seeds.seedSourceCredits,
	seeds.seedSourceExcerpts,
	seeds.seedSourceLinks,
	seeds.seedStudyTrails,
	seeds.seedStudyTrailItems,
	seeds.seedTextualNotes,
	seeds.seedTextualVariants,
	seeds.seedTextualVariantWitnesses,
	seeds.seedThemePassages,
	seeds.seedThemeRelationships,
	seeds.seedUserPreferences,
	seeds.seedWordOccurrences,
];

const seedsByName = new Map(orderedSeeds.map((seed) => [seed.name, seed]));

function toSeedName(value: string): string {
	const baseName = value
		.split("/")
		.at(-1)
		?.replace(/\.ts$/, "")
		.replace(/[-_](\w)/g, (_, character: string) => character.toUpperCase());

	if (!baseName) return "";
	return baseName.startsWith("seed")
		? baseName
		: `seed${baseName.charAt(0).toUpperCase()}${baseName.slice(1)}`;
}

function seedsFromArgs(args: string[]): Seed[] {
	const requested = args.flatMap((arg, index) => {
		if (arg.startsWith("--specific=")) {
			return [arg.split("=", 2)[1] ?? ""];
		}
		return arg === "--specific" ? [args[index + 1] ?? ""] : [];
	});

	if (requested.length === 0) return orderedSeeds;

	return requested.map((value) => {
		const name = toSeedName(value);
		const seed = seedsByName.get(name);
		if (seed) return seed;

		const available = [...seedsByName.keys()]
			.map((seedName) => seedName.slice(4))
			.join(", ");
		throw new Error(`Unknown seed '${value}'. Available seeds: ${available}.`);
	});
}

export async function clearSeedData(): Promise<void> {
	const tables = await db.execute<{ table_name: string }>(sql`
		SELECT quote_ident(schemaname) || '.' || quote_ident(tablename) AS table_name
		FROM pg_tables
		WHERE schemaname = 'public'
			AND tablename <> '__drizzle_migrations'
	`);

	const tableNames = tables.rows.map(({ table_name }) => table_name);
	if (tableNames.length === 0) return;

	await db.execute(
		sql.raw(`TRUNCATE TABLE ${tableNames.join(", ")} RESTART IDENTITY CASCADE`),
	);
}

export async function seedAll(
	count = 50,
	seedsToRun = orderedSeeds,
): Promise<void> {
	if (!Number.isSafeInteger(count) || count < 2) {
		throw new Error(
			"Seed count must be an integer of at least 2 for self-referencing relationships.",
		);
	}

	const context = createSeedContext();
	for (const seed of seedsToRun) {
		await seed(context, count);
	}
}

function countFromArgs(args: string[]): number {
	const countFlag = args.find(
		(arg) => arg.startsWith("--count=") || arg.startsWith("count="),
	);
	const countIndex = args.indexOf("--count");
	const count =
		countFlag?.split("=", 2)[1] ??
		(countIndex === -1 ? undefined : args[countIndex + 1]);
	return count ? Number(count) : 50;
}

async function main(args: string[]): Promise<void> {
	if (args.includes("--reset")) {
		await clearSeedData();
	}

	await seedAll(countFromArgs(args), seedsFromArgs(args));
}

void main(process.argv.slice(2))
	.then(() => process.exit(0))
	.catch((error: unknown) => {
		console.error(error);
		process.exit(1);
	});
