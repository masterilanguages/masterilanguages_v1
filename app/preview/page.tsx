import LandingShell from "@/components/landing/LandingShell";

export const metadata = {
  title: "Masteri Languages — Preview (hero variants)",
  description: "Design switcher for the Masteri Languages landing hero.",
  robots: { index: false, follow: false },
};

export default function PreviewLanding() {
  return <LandingShell showSwitcher />;
}
