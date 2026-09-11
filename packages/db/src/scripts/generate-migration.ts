import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
	autoGenerationFailureMarker,
	buildDownMigrationSql,
	type MigrationContext,
	validateGeneratedDownSql,
} from "./migration-reversal.js";

const dbRoot = path.resolve(import.meta.dirname, "../..");
const migrationsDir = path.resolve(dbRoot, "src/migrations");
const migrationsMetaDir = path.resolve(migrationsDir, "meta");
const journalPath = path.resolve(migrationsMetaDir, "_journal.json");
const drizzleKitBin = path.resolve(
	dbRoot,
	`node_modules/.bin/drizzle-kit${process.platform === "win32" ? ".cmd" : ""}`,
);

function getForwardMigrationTag(filename: string): string | null {
	if (!filename.endsWith(".sql")) {
		return null;
	}

	if (filename.endsWith(".down.sql")) {
		return null;
	}

	return filename.slice(0, -".sql".length);
}

export function normalizeForwardMigrationSql(sql: string): string {
	return sql
		.replace(
			/(ALTER\s+TYPE\s+(?:(?:"[^"]+"\.)?"[^"]+")\s+ADD\s+VALUE)(?!\s+IF\s+NOT\s+EXISTS)(\s+'(?:''|[^'])*'\s*;?)/gi,
			"$1 IF NOT EXISTS$2",
		)
		.replace(
			/(ALTER\s+TYPE\s+(?:(?:"[^"]+"\.)?"[^"]+")\s+ADD\s+VALUE)(?!\s+IF\s+NOT\s+EXISTS)(\s+'(?:''|[^'])*'\s+(?:BEFORE|AFTER)\s+'(?:''|[^'])*'\s*;?)/gi,
			"$1 IF NOT EXISTS$2",
		);
}

async function ensureMigrationsDir() {
	await fs.mkdir(migrationsDir, { recursive: true });
}

async function listForwardMigrationTags(): Promise<string[]> {
	const entries = await fs
		.readdir(migrationsDir, { withFileTypes: true })
		.catch((error) => {
			if (
				error &&
				typeof error === "object" &&
				"code" in error &&
				error.code === "ENOENT"
			) {
				return [];
			}

			throw error;
		});
	const files = entries
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name);

	return files
		.map(getForwardMigrationTag)
		.filter((tag): tag is string => tag !== null)
		.sort();
}

async function needsDownMigration(tag: string): Promise<boolean> {
	const downFilePath = path.resolve(migrationsDir, `${tag}.down.sql`);

	const downSql = await fs.readFile(downFilePath, "utf8").catch((error) => {
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "ENOENT"
		) {
			return null;
		}

		throw error;
	});

	return !downSql || downSql.includes(autoGenerationFailureMarker);
}

async function listRepairableDownMigrationTags(): Promise<string[]> {
	const tags = await listForwardMigrationTags();
	const repairableTags = [];

	for (const tag of tags) {
		if (await needsDownMigration(tag)) {
			repairableTags.push(tag);
		}
	}

	return repairableTags;
}

async function writeFailedDownFile(tag: string, reason: string): Promise<void> {
	const downFilePath = path.resolve(migrationsDir, `${tag}.down.sql`);
	const contents = [
		`-- ${autoGenerationFailureMarker}: manual rollback SQL is required.`,
		"-- The generator could not safely derive a reverse migration for this file.",
		`-- ${reason}`,
		"",
	].join("\n");

	await fs.writeFile(downFilePath, contents, { flag: "w" });
}

async function readJsonFile<T>(filePath: string): Promise<T> {
	const contents = await fs.readFile(filePath, "utf8");
	return JSON.parse(contents) as T;
}

function getSnapshotPath(idx: number): string {
	return path.resolve(
		migrationsMetaDir,
		`${String(idx).padStart(4, "0")}_snapshot.json`,
	);
}

interface MigrationJournal {
	entries: Array<{ idx: number; tag: string }>;
}

async function getMigrationContext(tag: string): Promise<MigrationContext> {
	const journal = await readJsonFile<MigrationJournal>(journalPath);
	const entry = journal.entries.find((candidate) => candidate.tag === tag);

	if (!entry) {
		throw new Error(
			`Could not find ${tag} in ${path.relative(dbRoot, journalPath)}.`,
		);
	}

	const currentSnapshot = await readJsonFile<
		MigrationContext["currentSnapshot"]
	>(getSnapshotPath(entry.idx));
	const previousSnapshot =
		entry.idx > 0
			? await readJsonFile<MigrationContext["currentSnapshot"]>(
					getSnapshotPath(entry.idx - 1),
				)
			: null;

	return {
		currentSnapshot,
		migrationTag: tag,
		previousSnapshot,
	};
}

async function generateDownFiles(
	newTags: ReadonlySet<string>,
	tags: readonly string[],
): Promise<void> {
	for (const tag of tags) {
		const forwardFilePath = path.resolve(migrationsDir, `${tag}.sql`);
		const downFilePath = path.resolve(migrationsDir, `${tag}.down.sql`);
		const shouldOverwriteDownFile = await needsDownMigration(tag);

		try {
			const existingForwardSql = await fs.readFile(forwardFilePath, "utf8");
			const forwardSql = newTags.has(tag)
				? normalizeForwardMigrationSql(existingForwardSql)
				: existingForwardSql;

			if (forwardSql !== existingForwardSql) {
				await fs.writeFile(forwardFilePath, forwardSql, { flag: "w" });
			}
			const migrationContext = await getMigrationContext(tag);
			const downSql = buildDownMigrationSql(forwardSql, migrationContext);
			validateGeneratedDownSql(downSql);
			await fs.writeFile(downFilePath, downSql, {
				flag: shouldOverwriteDownFile ? "w" : "wx",
			});
			console.log(`Created ${path.relative(dbRoot, downFilePath)}`);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (shouldOverwriteDownFile) {
				await writeFailedDownFile(tag, message);
			}
			throw new Error(
				`Failed to auto-generate ${path.relative(dbRoot, downFilePath)}. ${message}`,
			);
		}
	}
}

async function run() {
	await ensureMigrationsDir();

	const beforeTags = new Set(await listForwardMigrationTags());

	const result = spawnSync(
		drizzleKitBin,
		["generate", ...process.argv.slice(2)],
		{
			cwd: dbRoot,
			stdio: "inherit",
		},
	);

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}

	const afterTags = await listForwardMigrationTags();
	const newTags = afterTags.filter((tag) => !beforeTags.has(tag));
	const repairableTags = await listRepairableDownMigrationTags();
	const tagsToGenerate = Array.from(
		new Set([...newTags, ...repairableTags]),
	).sort();

	if (tagsToGenerate.length === 0) {
		console.log(
			"No new migration file was created and no rollback files need repair.",
		);
		return;
	}

	await generateDownFiles(new Set(newTags), tagsToGenerate);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	run().catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}
