"use client";

import { useEffect, useState } from "react";
import PublicLandingPage from "@/components/PublicLandingPage";
import { DEFAULT_LANDING_PAGE, loadLandingPage, type LandingPageContent } from "@/lib/landing-page";

export default function WebsitePage() {
  const [content, setContent] = useState<LandingPageContent>(DEFAULT_LANDING_PAGE);

  useEffect(() => {
    setContent(loadLandingPage());
  }, []);

  return <PublicLandingPage content={content} />;
}
