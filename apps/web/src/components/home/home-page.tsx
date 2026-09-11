import Header from "@/components/header";

import { FirstTimeHome } from "./first-time-home";
import { ReturningUserHome } from "./returning-user-home";

export default function HomePage() {
	const isFirstTimeUser = false;

	return (
		<main className="min-h-screen bg-background text-foreground">
			<Header />
			{isFirstTimeUser ? <FirstTimeHome /> : <ReturningUserHome />}
		</main>
	);
}
