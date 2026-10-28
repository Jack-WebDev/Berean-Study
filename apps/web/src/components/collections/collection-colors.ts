import type { CSSProperties } from "react";

/*
 * A collection's cover is one background colour. Everything else on the cover
 * (the text colour, and a deeper shade for dark mode) is worked out from it,
 * so a member can pick any colour and the cover's text still meets the 4.5:1
 * contrast that WCAG asks for. Every colour has a readable text colour (at
 * worst plain black or white), so a picked colour is never changed.
 *
 * The maths happens in OKLCH: lightness, chroma (how vivid) and hue. Changing
 * only lightness keeps a colour recognisably "the same colour".
 */

export type CoverPreset = {
	/** The preset's hand-picked text colour, used instead of a derived one. */
	ink: string;
	label: string;
	value: string;
};

export const coverPresets = [
	{ ink: "#2f4a35", label: "Sage", value: "#e4ebdf" },
	{ ink: "#233a5e", label: "Slate blue", value: "#dde4ee" },
	{ ink: "#6b4e12", label: "Wheat", value: "#f3e8cf" },
	{ ink: "#7a4321", label: "Clay", value: "#f1e1d3" },
	{ ink: "#57304f", label: "Plum", value: "#eadfe8" },
	{ ink: "#4a4740", label: "Stone", value: "#efebe4" },
] as const satisfies readonly CoverPreset[];

/** New collections start sage, as in the design. */
export const defaultCoverColor = coverPresets[0].value;

/** WCAG AA asks for 4.5:1; the headroom absorbs rounding to hex. */
const targetContrast = 4.8;

export type CoverColors = {
	background: string;
	darkBackground: string;
	darkInk: string;
	ink: string;
};

/** The four colours a cover needs, in light and dark mode. */
export function getCoverColors(color: string): CoverColors {
	const background = isHexColor(color)
		? color.toLowerCase()
		: coverPresets[5].value;
	const preset = coverPresets.find((option) => option.value === background);
	const ink = preset?.ink ?? findInk(background);

	// Light covers would glare on a dark page, so they deepen in dark mode.
	// Covers that are already dark keep their colour.
	const [lightness, chroma, hue] = hexToOklch(background);
	const darkBackground =
		lightness > 0.5
			? oklchToHex([0.32, Math.min(chroma * 1.4, 0.06), hue])
			: background;
	const darkInk = findInk(darkBackground);

	return { background, darkBackground, darkInk, ink };
}

/** CSS variables read by the `.collection-cover` class in index.css. */
export function coverStyle(color: string): CSSProperties {
	const colors = getCoverColors(color);
	return {
		"--cover": colors.background,
		"--cover-dark": colors.darkBackground,
		"--cover-ink": colors.ink,
		"--cover-ink-dark": colors.darkInk,
	} as CSSProperties;
}

/** WCAG 2 contrast ratio between two `#rrggbb` colours, from 1 to 21. */
export function contrastRatio(first: string, second: string) {
	const [lighter, darker] = [luminance(first), luminance(second)].sort(
		(left, right) => right - left,
	) as [number, number];
	return (lighter + 0.05) / (darker + 0.05);
}

export function isHexColor(value: string) {
	return /^#[0-9a-f]{6}$/i.test(value);
}

/**
 * A text colour in the background's own hue that reaches the target
 * contrast: dark text on light covers, light text on dark ones. On mid-tones
 * where no tinted shade gets there, plain black or white does.
 */
function findInk(background: string): string {
	const [lightness, chroma, hue] = hexToOklch(background);
	const inkChroma = Math.min(Math.max(chroma * 2.2, 0.025), 0.09);
	const darkFirst = lightness >= 0.6;
	for (const dark of darkFirst ? [true, false] : [false, true]) {
		for (let step = 0; step <= 40; step += 1) {
			const inkLightness = dark ? 0.45 - step * 0.01 : 0.9 + step * 0.0025;
			const ink = oklchToHex([
				inkLightness,
				dark ? inkChroma : inkChroma / 3,
				hue,
			]);
			if (contrastRatio(ink, background) >= targetContrast) return ink;
		}
	}
	return contrastRatio("#000000", background) >=
		contrastRatio("#ffffff", background)
		? "#000000"
		: "#ffffff";
}

function luminance(color: string) {
	const [red, green, blue] = hexToLinearRgb(color);
	return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function hexToLinearRgb(color: string): [number, number, number] {
	const value = Number.parseInt(color.slice(1), 16);
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(
		(channel) => {
			const srgb = channel / 255;
			return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
		},
	) as [number, number, number];
}

// OKLab conversions from https://bottosson.github.io/posts/oklab/
function hexToOklch(color: string): [number, number, number] {
	const [red, green, blue] = hexToLinearRgb(color);
	const long = Math.cbrt(
		0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue,
	);
	const medium = Math.cbrt(
		0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue,
	);
	const short = Math.cbrt(
		0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue,
	);
	const lightness =
		0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short;
	const a = 1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short;
	const b = 0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short;
	return [lightness, Math.hypot(a, b), Math.atan2(b, a)];
}

/** Converts to hex, lowering chroma until the colour fits in sRGB. */
function oklchToHex([lightness, chroma, hue]: [number, number, number]) {
	let low = 0;
	let high = chroma;
	let rgb = oklchToLinearRgb(lightness, high, hue);
	if (!inGamut(rgb)) {
		for (let attempt = 0; attempt < 20; attempt += 1) {
			const middle = (low + high) / 2;
			if (inGamut(oklchToLinearRgb(lightness, middle, hue))) low = middle;
			else high = middle;
		}
		rgb = oklchToLinearRgb(lightness, low, hue);
	}
	return `#${rgb
		.map((channel) => {
			const clamped = Math.min(Math.max(channel, 0), 1);
			const srgb =
				clamped <= 0.0031308
					? 12.92 * clamped
					: 1.055 * clamped ** (1 / 2.4) - 0.055;
			return Math.round(srgb * 255)
				.toString(16)
				.padStart(2, "0");
		})
		.join("")}`;
}

function oklchToLinearRgb(lightness: number, chroma: number, hue: number) {
	const a = chroma * Math.cos(hue);
	const b = chroma * Math.sin(hue);
	const long = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const medium = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const short = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
		-1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
		-0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
	];
}

function inGamut(rgb: number[]) {
	return rgb.every((channel) => channel >= -0.0001 && channel <= 1.0001);
}
