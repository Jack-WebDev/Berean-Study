import { createFileRoute } from "@tanstack/react-router";
import Header from "@/components/header";
import { FinalCallToAction } from "@/components/landing/final-call-to-action";
import { HeroSection } from "@/components/landing/hero-section";
import { ScriptureSection } from "@/components/landing/scripture-section";
import { StudyPrinciples } from "@/components/landing/study-principles";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	return (
		<div className="bg-background pb-20 text-foreground md:pb-0">
			<Header />

			<HeroSection />
			<StudyPrinciples />
			<ScriptureSection />
			<FinalCallToAction />
		</div>
	);
}
