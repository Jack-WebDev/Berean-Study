import * as seeds from "./index";
import { createSeedContext } from "./utils";

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
	seeds.seedNotes,
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

export async function seedAll(count = 50): Promise<void> {
	if (!Number.isSafeInteger(count) || count < 2) {
		throw new Error(
			"Seed count must be an integer of at least 2 for self-referencing relationships.",
		);
	}

	const context = createSeedContext();
	for (const seed of orderedSeeds) {
		await seed(context, count);
	}
}

function countFromArgs(args: string[]): number {
	const countFlag = args.find((arg) => arg.startsWith("--count="));
	const count =
		countFlag?.split("=", 2)[1] ?? args[args.indexOf("--count") + 1];
	return count ? Number(count) : 50;
}

void seedAll(countFromArgs(process.argv.slice(2)))
	.then(() => process.exit(0))
	.catch((error: unknown) => {
		console.error(error);
		process.exit(1);
	});
