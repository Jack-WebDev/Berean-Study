/*
 * Working with verse text: reading a pasted passage, spotting likely typing
 * mistakes, and comparing two wordings. This file has no imports so the browser
 * can use it while someone types.
 */

/** Psalm 119:176 is the highest verse number in the Bible. */
export const HIGHEST_VERSE_NUMBER = 176;

export type VerseCheckCode =
	| "leading_number"
	| "number_inside"
	| "double_space"
	| "straight_quotes"
	| "no_end_punctuation";

export type VerseCheck = {
	code: VerseCheckCode;
	message: string;
	/** Where to highlight, as start and end offsets into the text. */
	ranges: [number, number][];
};

function matchRanges(text: string, pattern: RegExp): [number, number][] {
	return [...text.matchAll(pattern)].map((match) => [
		match.index,
		match.index + match[0].length,
	]);
}

/**
 * Things worth a second look. These are prompts, not errors: a translation can
 * really have a number in a verse, or a verse that ends without punctuation.
 */
export function checkVerseText(text: string): VerseCheck[] {
	const checks: VerseCheck[] = [];
	const leading = /^\s*(\d+)/.exec(text);
	if (leading) {
		checks.push({
			code: "leading_number",
			message: `Starts with a number. Is "${leading[1]}" the verse number pasted in?`,
			ranges: [[0, leading[0].length]],
		});
	}

	const inside = matchRanges(text, /\d+/g).filter(
		([start]) => !leading || start >= leading[0].length,
	);
	if (inside.length > 0) {
		checks.push({
			code: "number_inside",
			message: "Has a number inside the text. Is it a stray verse number?",
			ranges: inside,
		});
	}

	const doubleSpaces = matchRanges(text, / {2,}/g);
	if (doubleSpaces.length > 0) {
		checks.push({
			code: "double_space",
			message: "Has a double space.",
			ranges: doubleSpaces,
		});
	}

	const straightQuotes = matchRanges(text, /["']/g);
	if (straightQuotes.length > 0) {
		checks.push({
			code: "straight_quotes",
			message:
				"Uses straight quotes where the printed text may have curly ones.",
			ranges: straightQuotes,
		});
	}

	if (/[\p{L}\p{N}]\s*$/u.test(text)) {
		checks.push({
			code: "no_end_punctuation",
			message: "Doesn't end with punctuation.",
			ranges: [],
		});
	}

	return checks;
}

/** The checks worth showing while someone is still typing. */
export function checkVerseWhileTyping(text: string) {
	return checkVerseText(text).filter(
		({ code }) => code === "leading_number" || code === "double_space",
	);
}

export type PasteOptions = {
	keepLineBreaks: boolean;
	removeHeadings: boolean;
	removeMarks: boolean;
};

export type ParsedPassage = {
	/** Verse numbers skipped between the first and last verse found. */
	missing: number[];
	/** Lines taken out as section headings, so the person can spot a wrong guess. */
	removedHeadings: string[];
	verses: { number: number; text: string }[];
};

const superscriptDigits: Record<string, string> = {
	"⁰": "0",
	"¹": "1",
	"²": "2",
	"³": "3",
	"⁴": "4",
	"⁵": "5",
	"⁶": "6",
	"⁷": "7",
	"⁸": "8",
	"⁹": "9",
};

/** Publishers set verse numbers in superscript, so they arrive as different characters. */
function normaliseCharacters(raw: string) {
	return raw
		.replace(/\r\n?/g, "\n")
		.replace(/ /g, " ")
		.replace(
			/[⁰¹²³⁴-⁹]+/g,
			(digits) =>
				` ${[...digits].map((digit) => superscriptDigits[digit]).join("")} `,
		);
}

const FOOTNOTE_MARKS = /\[[a-zA-Z]{1,2}\]|\([A-Z]{1,3}\)|[†‡§¶*]/g;

const STARTS_WITH_NUMBER = /^\s*[[(]?(?:\d{1,3}:)?\d{1,3}\b/;

/** Short, unpunctuated, and followed by a numbered line: a heading rather than Scripture. */
function splitOutHeadings(text: string) {
	const lines = text.split("\n");
	const removedHeadings: string[] = [];
	const kept = lines.filter((line, index) => {
		const trimmed = line.trim();
		if (!trimmed || STARTS_WITH_NUMBER.test(trimmed) || trimmed.length > 80) {
			return true;
		}
		if (/[.,;:!?'"”’)\]—-]$/.test(trimmed)) return true;
		const next = lines.slice(index + 1).find((later) => later.trim());
		if (next !== undefined && !STARTS_WITH_NUMBER.test(next)) return true;
		removedHeadings.push(trimmed);
		return false;
	});
	return { removedHeadings, text: kept.join("\n") };
}

type VerseNumberCandidate = {
	end: number;
	followedByLowercase: boolean;
	lineStart: boolean;
	number: number;
	start: number;
};

function findVerseNumberCandidates(text: string): VerseNumberCandidate[] {
	const pattern =
		/(^|[\s([])(?:\d{1,3}:)?(\d{1,3})[\])]?\.?(?=\s|[\p{L}“"‘'(]|$)/gmu;
	return [...text.matchAll(pattern)].map((match) => {
		const number = Number(match[2]);
		const start = match.index + (match[1]?.length ?? 0);
		const end = match.index + match[0].length;
		const lineStart = text.slice(text.lastIndexOf("\n", start - 1) + 1, start);
		return {
			end,
			followedByLowercase: /^\s*\p{Ll}/u.test(text.slice(end)),
			lineStart: lineStart.trim() === "",
			number,
			start,
		};
	});
}

/** Tells verse numbers from numbers in the wording, like "for 40 days". */
function chooseVerseNumbers(candidates: VerseNumberCandidate[]) {
	const chosen: VerseNumberCandidate[] = [];
	for (const [index, candidate] of candidates.entries()) {
		if (candidate.number < 1 || candidate.number > HIGHEST_VERSE_NUMBER) {
			continue;
		}
		const previous = chosen.at(-1)?.number;
		if (previous === undefined) {
			chosen.push(candidate);
			continue;
		}
		if (candidate.number === previous + 1) {
			const appearsAgainLater =
				candidate.followedByLowercase &&
				candidates
					.slice(index + 1)
					.some((later) => later.number === candidate.number);
			if (!appearsAgainLater) chosen.push(candidate);
			continue;
		}
		if (candidate.lineStart && candidate.number > previous) {
			chosen.push(candidate);
		}
	}
	return chosen;
}

function tidyVerseText(text: string, keepLineBreaks: boolean) {
	if (!keepLineBreaks) return text.replace(/\s+/g, " ").trim();
	return text
		.split("\n")
		.map((line) => line.replace(/[ \t]+/g, " ").trim())
		.filter(Boolean)
		.join("\n");
}

/**
 * Splits pasted text into verses using its verse numbers, and takes those numbers
 * out of the text. Anything before the first verse number is dropped.
 */
export function parsePastedPassage(
	raw: string,
	options: PasteOptions,
): ParsedPassage {
	let text = normaliseCharacters(raw);
	if (options.removeMarks) text = text.replace(FOOTNOTE_MARKS, "");

	let removedHeadings: string[] = [];
	if (options.removeHeadings) {
		const split = splitOutHeadings(text);
		removedHeadings = split.removedHeadings;
		text = split.text;
	}

	const numbers = chooseVerseNumbers(findVerseNumberCandidates(text));
	const verses = numbers.flatMap((verse, index) => {
		const wording = tidyVerseText(
			text.slice(verse.end, numbers[index + 1]?.start ?? text.length),
			options.keepLineBreaks,
		);
		return wording ? [{ number: verse.number, text: wording }] : [];
	});

	const found = new Set(verses.map(({ number }) => number));
	const first = verses[0]?.number ?? 0;
	const last = verses.at(-1)?.number ?? 0;
	const missing: number[] = [];
	for (let number = first; number <= last; number += 1) {
		if (!found.has(number)) missing.push(number);
	}

	return { missing, removedHeadings, verses };
}

export type WordChange = { kind: "same" | "added" | "removed"; text: string };

/** What changed between two wordings, word by word. */
export function diffWords(before: string, after: string): WordChange[] {
	const tokenize = (value: string) => value.match(/\s+|[^\s]+/g) ?? [];
	const a = tokenize(before);
	const b = tokenize(after);

	// Longest common subsequence, built from the end so the walk below is forward.
	const lengths = Array.from({ length: a.length + 1 }, () =>
		new Array<number>(b.length + 1).fill(0),
	);
	const at = (i: number, j: number) => lengths[i]?.[j] ?? 0;
	for (let i = a.length - 1; i >= 0; i -= 1) {
		for (let j = b.length - 1; j >= 0; j -= 1) {
			const row = lengths[i];
			if (row) {
				row[j] =
					a[i] === b[j]
						? at(i + 1, j + 1) + 1
						: Math.max(at(i + 1, j), at(i, j + 1));
			}
		}
	}

	const changes: WordChange[] = [];
	const push = (kind: WordChange["kind"], text: string) => {
		const last = changes.at(-1);
		if (last?.kind === kind) last.text += text;
		else changes.push({ kind, text });
	};

	let i = 0;
	let j = 0;
	while (i < a.length || j < b.length) {
		const removed = a[i];
		const added = b[j];
		if (removed !== undefined && removed === added) {
			push("same", removed);
			i += 1;
			j += 1;
		} else if (
			removed !== undefined &&
			(added === undefined || at(i + 1, j) >= at(i, j + 1))
		) {
			push("removed", removed);
			i += 1;
		} else if (added !== undefined) {
			push("added", added);
			j += 1;
		}
	}
	return changes;
}

/** "23, 24" or "1–5, 9", for messages about several verses. */
export function formatVerseList(numbers: readonly number[]) {
	const sorted = [...numbers].sort((a, b) => a - b);
	const parts: string[] = [];
	for (let index = 0; index < sorted.length; ) {
		const start = sorted[index] as number;
		let end = start;
		while (sorted[index + 1] === end + 1) {
			end += 1;
			index += 1;
		}
		index += 1;
		if (end - start >= 2) parts.push(`${start}–${end}`);
		else if (end > start) parts.push(`${start}, ${end}`);
		else parts.push(String(start));
	}
	return parts.join(", ");
}
