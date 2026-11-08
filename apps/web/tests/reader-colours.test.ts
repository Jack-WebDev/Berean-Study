import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/*
 * Checks the reader's colour pairings against the readability rules in the design
 * handoff (§1): Scripture at least 7:1, other text at least 4.5:1, and small marks
 * such as the study dot at least 3:1. The colours are read straight from the CSS,
 * so changing an app colour that makes reader text hard to read fails here.
 */

const cssFiles = [
	"../../../packages/ui/src/styles/globals.css",
	"../src/index.css",
].map((path) =>
	readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8"),
);

type Mode = "light" | "dark";

function readDeclarations(): Record<Mode, Map<string, string>> {
	const light = new Map<string, string>();
	const dark = new Map<string, string>();
	for (const css of cssFiles) {
		for (const block of css.matchAll(/(?:^|\n)(:root|\.dark)\s*\{([^}]*)\}/g)) {
			const target = block[1] === ":root" ? light : dark;
			for (const [, name, value] of (block[2] ?? "").matchAll(
				/--([\w-]+):\s*([^;]+);/g,
			)) {
				if (name && value) target.set(name, value.trim());
			}
		}
	}
	// Dark mode only overrides some colours; the rest carry over from light.
	return { light, dark: new Map([...light, ...dark]) };
}

const declarations = readDeclarations();

type Oklch = [lightness: number, chroma: number, hue: number];

function resolveColour(mode: Mode, name: string): Oklch {
	const value = declarations[mode].get(name);
	if (!value) throw new Error(`No colour called --${name}`);
	const alias = /^var\(--([\w-]+)\)$/.exec(value);
	if (alias?.[1]) return resolveColour(mode, alias[1]);
	const oklch = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(value);
	if (!oklch) throw new Error(`--${name} isn't a plain oklch colour: ${value}`);
	return [Number(oklch[1]), Number(oklch[2]), Number(oklch[3])];
}

/** How bright a colour looks, from 0 (black) to 1 (white), as WCAG measures it. */
function relativeLuminance([lightness, chroma, hue]: Oklch) {
	const a = chroma * Math.cos((hue * Math.PI) / 180);
	const b = chroma * Math.sin((hue * Math.PI) / 180);
	const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
	const clamp = (channel: number) => Math.min(1, Math.max(0, channel));
	const red = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
	const green = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
	const blue = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
	return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(mode: Mode, foreground: string, background: string) {
	const first = relativeLuminance(resolveColour(mode, foreground));
	const second = relativeLuminance(resolveColour(mode, background));
	return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const scripture = 7;
const text = 4.5;
const mark = 3;

const pairings: Array<
	[foreground: string, background: string, minimum: number]
> = [
	["foreground", "background", scripture],
	["foreground", "card", scripture],
	["foreground", "verse-selected", scripture],
	["foreground", "verse-target", scripture],
	["verse-highlight-foreground", "verse-highlight", scripture],
	["muted-foreground", "background", text],
	["muted-foreground", "card", text],
	["verse-number", "background", text],
	["verse-number", "verse-selected", text],
	["verse-number", "verse-target", text],
	["verse-number-on-highlight", "verse-highlight", text],
	["reader-notice-foreground", "reader-notice", text],
	["reader-toast-foreground", "reader-toast", text],
	["primary-foreground", "primary", text],
	["primary", "background", text],
	["study-marker", "background", mark],
	["study-marker", "verse-selected", mark],
	["study-marker", "verse-target", mark],
	["study-marker", "verse-highlight", mark],
	["verse-selected-ring", "verse-selected", mark],
	["verse-target-ring", "verse-target", mark],
	["ring", "background", mark],
];

describe("reader colours", () => {
	for (const mode of ["light", "dark"] as const) {
		it.each(pairings)(
			`${mode}: --%s on --%s is at least %s:1`,
			(foreground, background, minimum) => {
				expect(contrast(mode, foreground, background)).toBeGreaterThanOrEqual(
					minimum,
				);
			},
		);
	}
});
