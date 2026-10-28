import { describe, expect, it } from "vitest";

import {
	contrastRatio,
	coverPresets,
	getCoverColors,
} from "../src/components/collections/collection-colors";

// Every colour on a 6×6×6 grid across sRGB, from black to white.
const levels = ["00", "33", "66", "99", "cc", "ff"];
const sampleColors = levels.flatMap((red) =>
	levels.flatMap((green) => levels.map((blue) => `#${red}${green}${blue}`)),
);

describe("collection cover colours", () => {
	it("keeps the presets and their hand-picked text colours", () => {
		for (const preset of coverPresets) {
			expect(getCoverColors(preset.value).background).toBe(preset.value);
			expect(getCoverColors(preset.value).ink).toBe(preset.ink);
			expect(contrastRatio(preset.ink, preset.value)).toBeGreaterThanOrEqual(
				4.5,
			);
		}
	});

	it("finds readable text for any colour, in light and dark mode", () => {
		for (const color of sampleColors) {
			const colors = getCoverColors(color);
			expect(
				contrastRatio(colors.ink, colors.background),
				`${color} light`,
			).toBeGreaterThanOrEqual(4.5);
			expect(
				contrastRatio(colors.darkInk, colors.darkBackground),
				`${color} dark`,
			).toBeGreaterThanOrEqual(4.5);
		}
	});

	it("deepens light covers in dark mode", () => {
		const { darkBackground } = getCoverColors(coverPresets[0].value);
		expect(contrastRatio(darkBackground, "#000000")).toBeLessThan(3);
	});

	it("never changes the colour the member picked", () => {
		for (const color of [...sampleColors, "#777777", "#757575"]) {
			expect(getCoverColors(color).background).toBe(color);
		}
	});

	it("falls back to stone for something that isn't a colour", () => {
		expect(getCoverColors("tomato").background).toBe("#efebe4");
	});
});
