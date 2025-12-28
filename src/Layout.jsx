import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import BuddyDock from "./components/game/BuddyDock";

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  
  // Don't show dock or run onboarding checks on these pages
  const isOnboardingPage = currentPageName === "LanguageSelect" || currentPageName === "AvatarSelect";
  const showDock = !isOnboardingPage;

  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Global onboarding gate - runs on every page load except onboarding pages
  useEffect(() => {
    if (isOnboardingPage || profileLoading) return;
    
    // No profile = start onboarding
    if (!userProfile) {
      navigate(createPageUrl("LanguageSelect"));
      return;
    }
    
    // Check is_new_user flag
    if (userProfile.is_new_user === true) {
      // Need language
      if (!userProfile.language) {
        navigate(createPageUrl("LanguageSelect"));
        return;
      }
      // Need avatar
      if (!userProfile.avatar_id) {
        navigate(createPageUrl("AvatarSelect"));
        return;
      }
    }
  }, [userProfile, profileLoading, isOnboardingPage, navigate]);

  const { data: userCoins } = useQuery({
    queryKey: ['userCoins'],
    queryFn: async () => {
      const coins = await base44.entities.UserCoins.list();
      return coins[0] || { coins: 0 };
    },
    enabled: showDock,
    staleTime: 2 * 60 * 1000,
  });

  const { data: backpackWords = [] } = useQuery({
    queryKey: ['backpackWords'],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank" }),
    enabled: showDock,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <>
      {children}
      {showDock && (
        <BuddyDock 
          profile={userProfile} 
          coins={userCoins?.coins} 
          backpackCount={backpackWords.length}
        />
      )}
    </>
  );
}