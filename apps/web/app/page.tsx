import { EditorialStory } from "../components/landing/editorial-story";
import { LandingHeader } from "../components/landing/landing-header";
import { Hero } from "../components/landing/hero";

export default function HomePage() {
  return (
    <>
      <LandingHeader />
      <main>
        <Hero />
        <EditorialStory />
      </main>
    </>
  );
}
