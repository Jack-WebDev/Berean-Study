export const statementBreakpoint = "--> statement-breakpoint";
export const autoGenerationFailureMarker = "AUTO-GENERATION FAILED";

type SnapshotColumn = { default?: string };
type SnapshotIndexColumn = {
	asc?: boolean;
	expression: string;
	isExpression: boolean;
	nulls?: string;
};
type SnapshotIndex = {
	columns: SnapshotIndexColumn[];
	concurrently?: boolean;
	isUnique?: boolean;
	method?: string;
	where?: string;
	with?: Record<string, string | number | boolean>;
};
type SnapshotTable = {
	checkConstraints?: Record<string, { value: string }>;
	columns?: Record<string, SnapshotColumn>;
	foreignKeys?: Record<
		string,
		{
			columnsFrom: string[];
			columnsTo: string[];
			onDelete?: string;
			onUpdate?: string;
			tableTo: string;
		}
	>;
	indexes?: Record<string, SnapshotIndex>;
	uniqueConstraints?: Record<
		string,
		{ columns: string[]; nullsNotDistinct?: boolean }
	>;
};

export type MigrationContext = {
	currentSnapshot: { tables?: Record<string, SnapshotTable> };
	migrationTag: string;
	previousSnapshot: { tables?: Record<string, SnapshotTable> } | null;
};

type ReversalContext = {
	previousSnapshot?: MigrationContext["previousSnapshot"];
};

function getCapture(match: RegExpMatchArray, index: number): string {
	const capture = match[index];
	if (!capture) {
		throw new Error("Expected SQL identifier was not found.");
	}

	return capture;
}

export function splitStatements(sql: string): string[] {
	return sql
		.split(statementBreakpoint)
		.map((statement) => statement.trim())
		.filter(Boolean);
}

function stripLeadingSqlComments(statement: string): string {
	return statement
		.split("\n")
		.map((line) => line.trim())
		.filter((line, index, lines) => {
			if (line.length === 0) {
				return lines.slice(index + 1).some(Boolean);
			}

			return !line.startsWith("--");
		})
		.join("\n")
		.trim();
}

function getQualifiedRenamedRelation(
	relationName: string,
	newName: string,
): string {
	const relationMatch = relationName.match(/^(?:("[^"]+")\.)?("[^"]+")$/);

	if (!relationMatch) {
		throw new Error(
			`Unsupported relation name for rename reversal: ${relationName}`,
		);
	}

	const schema = relationMatch[1];
	return schema ? `${schema}.${newName}` : newName;
}

function unquoteIdentifier(identifier: string): string {
	return identifier.slice(1, -1).replaceAll('""', '"');
}

function quoteIdentifier(identifier: string): string {
	return `"${identifier.replaceAll('"', '""')}"`;
}

function getSnapshotTableKey(relationName: string): string {
	const relationMatch = relationName.match(/^(?:("[^"]+")\.)?("[^"]+")$/);

	if (!relationMatch) {
		throw new Error(
			`Unsupported relation name for snapshot lookup: ${relationName}`,
		);
	}

	const schema = relationMatch[1]
		? unquoteIdentifier(relationMatch[1])
		: "public";
	const table = unquoteIdentifier(getCapture(relationMatch, 2));
	return `${schema}.${table}`;
}

function getPreviousColumnSnapshot(
	context: ReversalContext,
	relationName: string,
	columnName: string,
	statement: string,
): SnapshotColumn {
	if (!context.previousSnapshot) {
		throw new Error(
			`Unsupported statement: ${statement}. Previous schema snapshot is required to reverse this safely.`,
		);
	}

	const tableKey = getSnapshotTableKey(relationName);
	const columnKey = unquoteIdentifier(columnName);
	const table = context.previousSnapshot.tables?.[tableKey];

	if (!table) {
		throw new Error(
			`Unsupported statement: ${statement}. Could not find ${tableKey} in the previous schema snapshot.`,
		);
	}

	const column = table.columns?.[columnKey];

	if (!column) {
		throw new Error(
			`Unsupported statement: ${statement}. Could not find ${tableKey}.${columnKey} in the previous schema snapshot.`,
		);
	}

	return column;
}

type PreviousConstraint =
	| {
			kind: "check";
			constraint: NonNullable<SnapshotTable["checkConstraints"]>[string];
	  }
	| {
			kind: "foreignKey";
			constraint: NonNullable<SnapshotTable["foreignKeys"]>[string];
	  }
	| {
			kind: "unique";
			constraint: NonNullable<SnapshotTable["uniqueConstraints"]>[string];
	  };

function getPreviousConstraintSnapshot(
	context: ReversalContext,
	relationName: string,
	constraintName: string,
	statement: string,
): PreviousConstraint {
	if (!context.previousSnapshot) {
		throw new Error(
			`Unsupported statement: ${statement}. Previous schema snapshot is required to reverse this safely.`,
		);
	}

	const tableKey = getSnapshotTableKey(relationName);
	const table = context.previousSnapshot.tables?.[tableKey];
	const constraintKey = unquoteIdentifier(constraintName);

	if (!table) {
		throw new Error(
			`Unsupported statement: ${statement}. Could not find ${tableKey} in the previous schema snapshot.`,
		);
	}

	if (table.checkConstraints?.[constraintKey]) {
		return {
			kind: "check",
			constraint: table.checkConstraints[constraintKey],
		};
	}

	if (table.foreignKeys?.[constraintKey]) {
		return {
			kind: "foreignKey",
			constraint: table.foreignKeys[constraintKey],
		};
	}

	if (table.uniqueConstraints?.[constraintKey]) {
		return {
			kind: "unique",
			constraint: table.uniqueConstraints[constraintKey],
		};
	}

	throw new Error(
		`Unsupported statement: ${statement}. Could not find constraint ${constraintKey} on ${tableKey} in the previous schema snapshot.`,
	);
}

function getQualifiedRelationNameFromTableKey(tableKey: string): string {
	const [schema, ...tableParts] = tableKey.split(".");

	if (!schema || tableParts.length === 0) {
		throw new Error(`Unsupported snapshot table key: ${tableKey}`);
	}

	return `${quoteIdentifier(schema)}.${quoteIdentifier(tableParts.join("."))}`;
}

function getPreviousIndexSnapshot(
	context: ReversalContext,
	indexName: string,
	statement: string,
): { index: SnapshotIndex; relationName: string } {
	if (!context.previousSnapshot) {
		throw new Error(
			`Unsupported statement: ${statement}. Previous schema snapshot is required to reverse this safely.`,
		);
	}

	const indexKey = unquoteIdentifier(indexName);

	for (const [tableKey, table] of Object.entries<SnapshotTable>(
		context.previousSnapshot.tables ?? {},
	)) {
		const previousIndex = table.indexes?.[indexKey];

		if (previousIndex) {
			return {
				relationName: getQualifiedRelationNameFromTableKey(tableKey),
				index: previousIndex,
			};
		}
	}

	throw new Error(
		`Unsupported statement: ${statement}. Could not find index ${indexKey} in the previous schema snapshot.`,
	);
}

function buildCreateIndexSql(
	relationName: string,
	indexName: string,
	previousIndex: SnapshotIndex,
): string {
	const unique = previousIndex.isUnique ? "UNIQUE " : "";
	const concurrently = previousIndex.concurrently ? "CONCURRENTLY " : "";
	const method = previousIndex.method ? ` USING ${previousIndex.method}` : "";
	const columns = previousIndex.columns
		.map((column) => {
			const expression = column.isExpression
				? column.expression
				: quoteIdentifier(column.expression);
			const direction = column.asc === false ? " DESC" : "";
			const nulls =
				column.nulls && (column.asc === false || column.nulls !== "last")
					? ` NULLS ${column.nulls.toUpperCase()}`
					: "";

			return `${expression}${direction}${nulls}`;
		})
		.join(", ");
	const withOptions =
		previousIndex.with && Object.keys(previousIndex.with).length > 0
			? ` WITH (${Object.entries(previousIndex.with)
					.map(([key, value]) => `${key}=${value}`)
					.join(", ")})`
			: "";
	const where = previousIndex.where ? ` WHERE ${previousIndex.where}` : "";

	return `CREATE ${unique}INDEX ${concurrently}${indexName} ON ${relationName}${method} (${columns})${withOptions}${where};`;
}

function buildAddConstraintSql(
	relationName: string,
	constraintName: string,
	previousConstraint: PreviousConstraint,
): string {
	if (previousConstraint.kind === "check") {
		return `ALTER TABLE ${relationName} ADD CONSTRAINT ${constraintName} CHECK (${previousConstraint.constraint.value});`;
	}

	if (previousConstraint.kind === "foreignKey") {
		const columnsFrom = previousConstraint.constraint.columnsFrom
			.map((column) => quoteIdentifier(column))
			.join(", ");
		const columnsTo = previousConstraint.constraint.columnsTo
			.map((column) => quoteIdentifier(column))
			.join(", ");
		const tableTo = quoteIdentifier(previousConstraint.constraint.tableTo);
		const onDelete = previousConstraint.constraint.onDelete
			? ` ON DELETE ${previousConstraint.constraint.onDelete}`
			: "";
		const onUpdate = previousConstraint.constraint.onUpdate
			? ` ON UPDATE ${previousConstraint.constraint.onUpdate}`
			: "";

		return `ALTER TABLE ${relationName} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${columnsFrom}) REFERENCES ${tableTo}(${columnsTo})${onDelete}${onUpdate};`;
	}

	if (previousConstraint.kind === "unique") {
		const columns = previousConstraint.constraint.columns
			.map((column) => quoteIdentifier(column))
			.join(", ");
		const nullsNotDistinct = previousConstraint.constraint.nullsNotDistinct
			? " NULLS NOT DISTINCT"
			: "";

		return `ALTER TABLE ${relationName} ADD CONSTRAINT ${constraintName} UNIQUE${nullsNotDistinct} (${columns});`;
	}

	throw new Error("Unsupported previous constraint kind.");
}

export function reverseStatement(
	statement: string,
	context: ReversalContext = {},
): string {
	const trimmed = statement.trim();
	const matchable = stripLeadingSqlComments(trimmed);
	const relationPattern = '((?:"[^"]+"\\.)?"[^"]+")';
	const identifierPattern = '("[^"]+")';

	const createTableMatch = matchable.match(
		new RegExp(
			`^CREATE TABLE(?: IF NOT EXISTS)?\\s+${relationPattern}\\s*\\(`,
			"is",
		),
	);
	if (createTableMatch) {
		return `DROP TABLE IF EXISTS ${createTableMatch[1]};`;
	}

	const createSequenceMatch = matchable.match(
		new RegExp(
			`^CREATE SEQUENCE(?: IF NOT EXISTS)?\\s+${relationPattern}(?:\\s|;|$)`,
			"is",
		),
	);
	if (createSequenceMatch) {
		return `DROP SEQUENCE IF EXISTS ${createSequenceMatch[1]};`;
	}

	const createSchemaMatch = matchable.match(
		new RegExp(
			`^CREATE SCHEMA(?: IF NOT EXISTS)?\\s+${relationPattern}(?:\\s|;|$)`,
			"is",
		),
	);
	if (createSchemaMatch) {
		return `DROP SCHEMA IF EXISTS ${createSchemaMatch[1]};`;
	}

	const createExtensionMatch = matchable.match(
		new RegExp(
			`^CREATE EXTENSION(?: IF NOT EXISTS)?\\s+${identifierPattern}\\b`,
			"is",
		),
	);
	if (createExtensionMatch) {
		return `DROP EXTENSION IF EXISTS ${createExtensionMatch[1]};`;
	}

	const createIndexMatch = matchable.match(
		new RegExp(
			`^CREATE(?: UNIQUE)? INDEX(?: CONCURRENTLY)?(?: IF NOT EXISTS)?\\s+${identifierPattern}\\s+ON\\s+`,
			"is",
		),
	);
	if (createIndexMatch) {
		return `DROP INDEX IF EXISTS ${createIndexMatch[1]};`;
	}

	const dropIndexMatch = matchable.match(
		new RegExp(
			`^DROP INDEX(?: CONCURRENTLY)?(?: IF EXISTS)?\\s+${identifierPattern}\\s*;?$`,
			"is",
		),
	);
	if (dropIndexMatch) {
		const previousIndex = getPreviousIndexSnapshot(
			context,
			getCapture(dropIndexMatch, 1),
			trimmed,
		);

		return buildCreateIndexSql(
			previousIndex.relationName,
			getCapture(dropIndexMatch, 1),
			previousIndex.index,
		);
	}

	const createTypeMatch = matchable.match(
		new RegExp(`^CREATE TYPE\\s+${relationPattern}\\s+AS ENUM\\s*\\(`, "is"),
	);
	if (createTypeMatch) {
		return `DROP TYPE IF EXISTS ${createTypeMatch[1]};`;
	}

	const createViewMatch = matchable.match(
		new RegExp(
			`^CREATE(?: OR REPLACE)? VIEW\\s+${relationPattern}\\s+AS\\s+`,
			"is",
		),
	);
	if (createViewMatch) {
		return `DROP VIEW IF EXISTS ${createViewMatch[1]};`;
	}

	const createMaterializedViewMatch = matchable.match(
		new RegExp(
			`^CREATE MATERIALIZED VIEW\\s+${relationPattern}\\s+AS\\s+`,
			"is",
		),
	);
	if (createMaterializedViewMatch) {
		return `DROP MATERIALIZED VIEW IF EXISTS ${createMaterializedViewMatch[1]};`;
	}

	const addConstraintMatch = matchable.match(
		new RegExp(
			`^ALTER TABLE\\s+${relationPattern}\\s+ADD CONSTRAINT\\s+${identifierPattern}\\s+`,
			"is",
		),
	);
	if (addConstraintMatch) {
		return `ALTER TABLE ${addConstraintMatch[1]} DROP CONSTRAINT IF EXISTS ${addConstraintMatch[2]};`;
	}

	const dropConstraintMatch = matchable.match(
		new RegExp(
			`^ALTER TABLE\\s+${relationPattern}\\s+DROP CONSTRAINT(?: IF EXISTS)?\\s+${identifierPattern}\\s*;?$`,
			"is",
		),
	);
	if (dropConstraintMatch) {
		const previousConstraint = getPreviousConstraintSnapshot(
			context,
			getCapture(dropConstraintMatch, 1),
			getCapture(dropConstraintMatch, 2),
			trimmed,
		);

		return buildAddConstraintSql(
			getCapture(dropConstraintMatch, 1),
			getCapture(dropConstraintMatch, 2),
			previousConstraint,
		);
	}

	const addColumnMatch = matchable.match(
		new RegExp(
			`^ALTER TABLE\\s+${relationPattern}\\s+ADD COLUMN(?: IF NOT EXISTS)?\\s+${identifierPattern}\\s+`,
			"is",
		),
	);
	if (addColumnMatch) {
		return `ALTER TABLE ${addColumnMatch[1]} DROP COLUMN IF EXISTS ${addColumnMatch[2]};`;
	}

	const addValueToEnumMatch = matchable.match(
		new RegExp(`^ALTER TYPE\\s+${relationPattern}\\s+ADD VALUE\\b`, "is"),
	);
	if (addValueToEnumMatch) {
		throw new Error(
			`Unsupported statement: ${trimmed}. PostgreSQL enum values require a manual rollback migration.`,
		);
	}

	const setDefaultMatch = matchable.match(
		new RegExp(
			`^ALTER TABLE\\s+${relationPattern}\\s+ALTER COLUMN\\s+${identifierPattern}\\s+SET DEFAULT\\s+`,
			"is",
		),
	);
	if (setDefaultMatch) {
		return `ALTER TABLE ${setDefaultMatch[1]} ALTER COLUMN ${setDefaultMatch[2]} DROP DEFAULT;`;
	}

	const dropDefaultMatch = matchable.match(
		new RegExp(
			`^ALTER TABLE\\s+${relationPattern}\\s+ALTER COLUMN\\s+${identifierPattern}\\s+DROP DEFAULT\\s*;?$`,
			"is",
		),
	);
	if (dropDefaultMatch) {
		const previousColumn = getPreviousColumnSnapshot(
			context,
			getCapture(dropDefaultMatch, 1),
			getCapture(dropDefaultMatch, 2),
			trimmed,
		);

		if ("default" in previousColumn) {
			return `ALTER TABLE ${dropDefaultMatch[1]} ALTER COLUMN ${dropDefaultMatch[2]} SET DEFAULT ${previousColumn.default};`;
		}

		return `ALTER TABLE ${dropDefaultMatch[1]} ALTER COLUMN ${dropDefaultMatch[2]} DROP DEFAULT;`;
	}

	const setNotNullMatch = matchable.match(
		new RegExp(
			`^ALTER TABLE\\s+${relationPattern}\\s+ALTER COLUMN\\s+${identifierPattern}\\s+SET NOT NULL\\s*;?$`,
			"is",
		),
	);
	if (setNotNullMatch) {
		return `ALTER TABLE ${setNotNullMatch[1]} ALTER COLUMN ${setNotNullMatch[2]} DROP NOT NULL;`;
	}

	const dropNotNullMatch = matchable.match(
		new RegExp(
			`^ALTER TABLE\\s+${relationPattern}\\s+ALTER COLUMN\\s+${identifierPattern}\\s+DROP NOT NULL\\s*;?$`,
			"is",
		),
	);
	if (dropNotNullMatch) {
		throw new Error(
			`Unsupported statement: ${trimmed}. Dropping NOT NULL cannot be auto-reversed safely.`,
		);
	}

	const renameColumnMatch = matchable.match(
		new RegExp(
			`^ALTER TABLE\\s+${relationPattern}\\s+RENAME COLUMN\\s+${identifierPattern}\\s+TO\\s+${identifierPattern}\\s*;?$`,
			"is",
		),
	);
	if (renameColumnMatch) {
		return `ALTER TABLE ${renameColumnMatch[1]} RENAME COLUMN ${renameColumnMatch[3]} TO ${renameColumnMatch[2]};`;
	}

	const renameTableMatch = matchable.match(
		new RegExp(
			`^ALTER TABLE\\s+${relationPattern}\\s+RENAME TO\\s+${identifierPattern}\\s*;?$`,
			"is",
		),
	);
	if (renameTableMatch) {
		const originalRelation = getCapture(renameTableMatch, 1);
		const renamedRelation = getQualifiedRenamedRelation(
			originalRelation,
			getCapture(renameTableMatch, 2),
		);
		const originalName = originalRelation.match(/(".*")$/)?.[1];

		if (!originalName) {
			throw new Error(`Unsupported rename reversal for statement: ${trimmed}`);
		}

		return `ALTER TABLE ${renamedRelation} RENAME TO ${originalName};`;
	}

	const setDataTypeMatch = matchable.match(
		new RegExp(
			`^ALTER TABLE\\s+${relationPattern}\\s+ALTER COLUMN\\s+${identifierPattern}\\s+SET DATA TYPE\\s+`,
			"is",
		),
	);
	if (setDataTypeMatch) {
		throw new Error(
			`Unsupported statement: ${trimmed}. Column type changes cannot be auto-reversed safely.`,
		);
	}

	const dropColumnMatch = matchable.match(
		new RegExp(`^ALTER TABLE\\s+${relationPattern}\\s+DROP COLUMN\\s+`, "is"),
	);
	if (dropColumnMatch) {
		throw new Error(
			`Unsupported statement: ${trimmed}. Dropped columns cannot be auto-reversed safely.`,
		);
	}

	const dropTableMatch = matchable.match(/^DROP TABLE\s+/is);
	if (dropTableMatch) {
		throw new Error(
			`Unsupported statement: ${trimmed}. Dropped tables cannot be auto-reversed safely.`,
		);
	}

	throw new Error(`Unsupported statement: ${trimmed}`);
}

export function buildDownMigrationSql(
	forwardSql: string,
	context: ReversalContext = {},
): string {
	const statements = splitStatements(forwardSql);
	const reversedStatements = [];

	for (const statement of [...statements].reverse()) {
		reversedStatements.push(reverseStatement(statement, context));
	}

	return `${reversedStatements.join(`\n${statementBreakpoint}\n`)}\n`;
}

export function validateGeneratedDownSql(downSql: string): string[] {
	if (!downSql.trim()) {
		throw new Error("Generated down SQL is empty.");
	}

	if (downSql.includes(autoGenerationFailureMarker)) {
		throw new Error(
			"Generated down SQL contains an auto-generation failure marker.",
		);
	}

	const statements = splitStatements(downSql);
	if (statements.length === 0) {
		throw new Error(
			"Generated down SQL does not contain any executable statements.",
		);
	}

	return statements;
}
