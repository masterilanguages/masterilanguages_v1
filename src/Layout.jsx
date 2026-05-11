import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import TranslatorWidget from "@/components/TranslatorWidget";
import StickyNote from "@/components/StickyNote";
import GameHeader from "@/components/game/GameHeader";

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionActive, setSessionActive] = useState(false);
  
  // Don't show dock or run onboarding checks on these pages
  const isOnboardingPage = currentPageName === "LanguageSelect" || currentPageName === "AvatarSelect";

  // Get current user (always runs)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {
        setCurrentUser(null);
      } finally {
        setIsAuthChecked(true);
      }
    };
    fetchUser();
  }, []);

  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const profiles = await base44.entities.UserProfile.filter({ created_by: currentUser.email });
      console.log('Layout: Profile query result:', { 
        email: currentUser.email, 
        foundProfile: profiles[0], 
        hasLanguage: profiles[0]?.language,
        isNewUser: profiles[0]?.is_new_user,
        hasAvatar: profiles[0]?.avatar_id 
      });
      return profiles[0] || null;
    },
    staleTime: 0,  // Don't use stale data for profile checks
    cacheTime: 0,  // Don't cache profile data
    enabled: isAuthChecked && !!currentUser,
  });

  const { data: userCoins } = useQuery({
    queryKey: ['userCoins', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return { coins: 0 };
      const coins = await base44.entities.UserCoins.list();
      return coins[0] || { coins: 0 };
    },
    enabled: isAuthChecked && !!currentUser,
  });

  // Inactivity detection - reset session if no activity for 2 minutes
  useEffect(() => {
    if (!sessionActive) return;

    const checkInactivity = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivity;
      if (timeSinceLastActivity > 2 * 60 * 1000) { // 2 minutes
        setSessionActive(false);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkInactivity);
  }, [sessionActive, lastActivity]);

  // Track user activity globally
  useEffect(() => {
    const handleActivity = () => {
      if (sessionActive) {
        setLastActivity(Date.now());
      }
    };

    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [sessionActive]);

  // Only redirect authenticated users with loaded profiles
  useEffect(() => {
    console.log('Layout redirect check:', {
      isOnboardingPage,
      isAuthChecked,
      profileLoading,
      hasUser: !!currentUser,
      hasProfile: !!userProfile,
      language: userProfile?.language,
      isNewUser: userProfile?.is_new_user,
      hasAvatar: userProfile?.avatar_id,
      currentPage: currentPageName
    });

    if (isOnboardingPage) {
      console.log("On onboarding page, skipping redirects");
      return;
    }
    
    if (!isAuthChecked) {
      console.log("Auth not checked yet");
      return;
    }
    
    if (profileLoading) {
      console.log("Profile still loading");
      return;
    }
    
    // Not authenticated - allow access to public pages
    if (!currentUser) {
      console.log("No user, allowing access");
      return;
    }
    
    // If no profile or no language, redirect to LanguageSelect
    if (!userProfile || !userProfile.language || userProfile.language === "") {
      console.log("→ Redirecting to LanguageSelect - no profile or language");
      navigate(createPageUrl("LanguageSelect"), { replace: true });
      return;
    }
  }, [isOnboardingPage, isAuthChecked, currentUser, profileLoading, userProfile, navigate, currentPageName]);

  // Debug label (dev only)
  const isDev = window.location.hostname === 'localhost' || window.location.hostname.includes('dev');
  
  // Show header on all pages except onboarding
  const showHeader = !isOnboardingPage && userProfile?.language;

  // Show loading during initial auth check
  if (!isAuthChecked) {
    return <div className="min-h-screen" style={{ background: "#0B0F1A" }} />;
  }

  // Block rendering only for authenticated users who need onboarding
  if (!isOnboardingPage && currentUser && !profileLoading) {
    if (!userProfile || !userProfile.language || userProfile.language === "") {
      return <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B0F1A" }}>        <div className="text-white text-center">
          <p className="mb-2">Redirecting to onboarding...</p>
          <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>;
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
      {isDev && isAuthChecked && (
        <div className="fixed top-0 left-0 z-[9999] bg-black/90 text-white text-xs px-3 py-1 font-mono">
          user: {currentUser?.id?.slice(0, 8) || 'none'} | 
          role: {currentUser?.role || 'none'} | 
          lang: {userProfile?.language || 'null'} | 
          route: {currentPageName} | 
          auth: {currentUser ? 'yes' : 'no'} |
          session: {sessionActive ? 'active' : 'inactive'}
        </div>
      )}
      {showHeader && <GameHeader profile={userProfile} coins={userCoins?.coins} sessionActive={sessionActive} onSessionToggle={() => { setSessionActive(!sessionActive); setLastActivity(Date.now()); }} />}
      {children}
      <TranslatorWidget />
      <StickyNote />
    </div>
  );
  }