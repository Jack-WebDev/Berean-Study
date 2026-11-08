import { Dialog } from "@base-ui/react/dialog";
import {
	type ReadingPreferences,
	type ReadingTextSize,
	readingTextSizeDetails,
	readingTextSizes,
	traditionDescriptions,
} from "@berean-study/db/reader-catalogue";
import { cn } from "@berean-study/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { useChangeReadingPreferences } from "@/components/reader/reading-preferences";
import { glyphPixels } from "@/components/reader/text-size-sheet";
import { ReaderButton } from "@/components/reader-ui/button";
import { ChoiceGroup, ChoiceTile } from "@/components/reader-ui/choice-group";
import {
	canonBooksQueryOptions,
	readerTranslationsQueryOptions,
} from "@/queries/reader";

/*
 * The first-time welcome (HANDOFF Screen 10): three quick questions the first
 * time someone opens the Bible. Which Bible, how big the words should be, and
 * which church's list of books. Every answer saves the moment it's chosen, every
 * question can be skipped, and once it's finished or skipped it never shows again.
 */

const notSure = "not-sure";
const stepCount = 3;

/** A choice that fills the width, with its name and a line under it. */
function WideChoice({
	description,
	label,
	value,
}: {
	description: string;
	label: string;
	value: string;
}) {
	return (
		<ChoiceTile
			className="min-h-[72px] items-start pr-10 pl-4 text-left"
			description={description}
			label={label}
			value={value}
			variant="outlined"
		/>
	);
}

function StepHeading({
	children,
	headingRef,
}: {
	children: ReactNode;
	headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
	return (
		<h1
			className="font-serif text-[30px] leading-tight outline-none"
			ref={headingRef}
			// Focus moves here at each step, so screen readers start at the question.
			tabIndex={-1}
		>
			{children}
		</h1>
	);
}

function Intro({ children }: { children: ReactNode }) {
	return (
		<p className="mt-2.5 text-[18px] text-foreground/85 leading-normal">
			{children}
		</p>
	);
}

export function Welcome({ preferences }: { preferences: ReadingPreferences }) {
	const change = useChangeReadingPreferences();
	const translations = useQuery(readerTranslationsQueryOptions());
	const books = useQuery(canonBooksQueryOptions());
	const [step, setStep] = useState(1);
	const [translation, setTranslation] = useState(
		preferences.translationAbbreviation ?? notSure,
	);
	const [tradition, setTradition] = useState(
		preferences.traditionSlug ?? notSure,
	);
	const headingRef = useRef<HTMLHeadingElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: runs when the step changes.
	useEffect(() => {
		headingRef.current?.focus();
	}, [step]);

	/** Finishing or skipping both mean the welcome is done for good. */
	const finish = () => change({ welcomeCompleted: true });
	const next = () => (step < stepCount ? setStep(step + 1) : finish());

	const available = translations.data?.filter((item) => item.available) ?? [];
	const unavailable =
		translations.data?.filter((item) => !item.available) ?? [];
	const firstAvailable = available[0];

	return (
		<Dialog.Root
			modal
			onOpenChange={(open) => {
				// Esc skips the rest, like Skip all.
				if (!open) finish();
			}}
			open
		>
			<Dialog.Portal>
				<Dialog.Popup
					aria-label="Welcome to the Bible"
					className="fixed inset-0 z-50 flex flex-col bg-background text-foreground outline-none"
					initialFocus={headingRef}
				>
					<div className="mx-auto flex w-full max-w-[640px] items-center justify-between gap-3 px-4 pt-3">
						<p className="font-semibold text-[15px] text-muted-foreground">
							Step {step} of {stepCount}
						</p>
						<ReaderButton onClick={finish} size="compact" variant="link">
							Skip all
						</ReaderButton>
					</div>
					<div
						aria-hidden="true"
						className="mx-auto grid w-full max-w-[640px] grid-cols-3 gap-1.5 px-4 pt-1"
					>
						{Array.from({ length: stepCount }, (_, index) => (
							<span
								className={cn(
									"h-1.5 rounded-full",
									index < step ? "bg-primary" : "bg-border",
								)}
								key={index}
							/>
						))}
					</div>

					<div className="min-h-0 flex-1 overflow-y-auto">
						<div className="mx-auto w-full max-w-[640px] px-4 pt-6 pb-4">
							{step === 1 ? (
								<>
									<StepHeading headingRef={headingRef}>
										Welcome to the Bible
									</StepHeading>
									<Intro>
										Three quick questions so it reads the way you like. You can
										skip any of them and change your answers later.
									</Intro>
									<h2 className="mt-7 mb-3 font-bold text-[20px]">
										Which Bible would you like to read?
									</h2>
									<ChoiceGroup
										label="Which Bible would you like to read?"
										onValueChange={(value: string) => {
											setTranslation(value);
											if (value !== notSure) {
												change({ translationAbbreviation: value });
											}
										}}
										value={translation}
									>
										{available.map((item) => (
											<WideChoice
												description={
													item.abbreviation === "KJV"
														? "Traditional English, used for 400 years"
														: "Ready to read"
												}
												key={item.abbreviation}
												label={`${item.name} (${item.abbreviation})`}
												value={item.abbreviation}
											/>
										))}
										<WideChoice
											description={
												firstAvailable
													? `We'll start you with the ${firstAvailable.name}`
													: "We'll choose one for you"
											}
											label="I'm not sure"
											value={notSure}
										/>
									</ChoiceGroup>
									{unavailable.length > 0 ? (
										<p className="mx-0.5 mt-3.5 text-[15px] text-muted-foreground leading-normal">
											Other translations (
											{unavailable.map((item) => item.abbreviation).join(", ")})
											are not available yet. We're waiting for permission from
											their publishers.
										</p>
									) : null}
								</>
							) : null}

							{step === 2 ? (
								<>
									<StepHeading headingRef={headingRef}>
										How big should the words be?
									</StepHeading>
									<Intro>
										Tap a size and see it below. Pick the one that's easy to
										read without glasses, if you can.
									</Intro>
									<div className="mt-5 rounded-2xl border border-border bg-card px-4 py-4">
										<p
											className="font-serif text-foreground leading-[1.75]"
											style={{
												fontSize:
													readingTextSizeDetails[preferences.textSize].pixels,
											}}
										>
											<span className="me-2 font-bold font-sans text-[0.6em] text-verse-number">
												1
											</span>
											The LORD is my shepherd; I shall not want.
										</p>
										<p className="mt-1 text-[15px] text-muted-foreground">
											Psalm 23:1
										</p>
									</div>
									<ChoiceGroup
										className="mt-4 grid-cols-2 min-[360px]:grid-cols-4"
										label="Text size"
										onValueChange={(textSize: ReadingTextSize) =>
											change({ textSize })
										}
										value={preferences.textSize}
									>
										{readingTextSizes.map((size) => (
											<ChoiceTile
												className="h-[92px]"
												key={size}
												label={readingTextSizeDetails[size].label}
												value={size}
												variant="outlined"
											>
												<span
													aria-hidden="true"
													className="font-serif leading-none"
													style={{ fontSize: glyphPixels[size] }}
												>
													A
												</span>
											</ChoiceTile>
										))}
									</ChoiceGroup>
								</>
							) : null}

							{step === 3 ? (
								<>
									<StepHeading headingRef={headingRef}>
										Which list of books does your church use?
									</StepHeading>
									<Intro>
										Churches include slightly different books in the Bible. This
										sets which books you see, and in what order.
									</Intro>
									<ChoiceGroup
										className="mt-5"
										label="Which list of books does your church use?"
										onValueChange={(value: string) => {
											setTradition(value);
											// "Not sure" uses the Protestant list.
											change({
												traditionSlug: value === notSure ? "protestant" : value,
											});
										}}
										value={tradition}
									>
										{(books.data?.traditions ?? []).map((item) => (
											<WideChoice
												description={[
													traditionDescriptions[item.slug],
													item.hasList
														? null
														: "Not ready yet, so you'll see the Protestant list for now.",
												]
													.filter(Boolean)
													.join(". ")}
												key={item.slug}
												label={item.name}
												value={item.slug}
											/>
										))}
										<WideChoice
											description="We'll show the Protestant list. You can change it later."
											label="I'm not sure"
											value={notSure}
										/>
									</ChoiceGroup>
								</>
							) : null}
						</div>
					</div>

					<div className="border-border border-t bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
						<div className="mx-auto flex w-full max-w-[640px] items-center gap-2">
							{step > 1 ? (
								<ReaderButton onClick={() => setStep(step - 1)}>
									Back
								</ReaderButton>
							) : null}
							<div className="flex-1" />
							{step < stepCount ? (
								<>
									<ReaderButton onClick={next} variant="link">
										Skip
									</ReaderButton>
									<ReaderButton
										className="px-6"
										onClick={next}
										variant="primary"
									>
										Continue
									</ReaderButton>
								</>
							) : (
								<ReaderButton
									className="px-6"
									onClick={finish}
									variant="primary"
								>
									Start reading
								</ReaderButton>
							)}
						</div>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
