import { LandingHeader } from "../components/landing/landing-header";
import { Hero } from "../components/landing/hero";

export default function HomePage() {
  return (
    <>
      <LandingHeader />
      <main>
        <Hero />
      </main>
    </>
  );
}
