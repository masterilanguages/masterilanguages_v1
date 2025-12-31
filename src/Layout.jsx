import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  
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
      console.log('Layout: Fetched profile for', currentUser.email, ':', profiles[0]);
      return profiles[0] || null;
    },
    staleTime: 5 * 60 * 1000,
    enabled: isAuthChecked && !!currentUser,
  });

  // Debug label (dev only)
  const isDev = window.location.hostname === 'localhost' || window.location.hostname.includes('dev');
  
  // Only redirect authenticated users with loaded profiles
  useEffect(() => {
    if (isOnboardingPage) return;
    if (!isAuthChecked || profileLoading) return;
    
    // Not authenticated - allow access to public pages
    if (!currentUser) return;
    
    // If no profile or no language, redirect to LanguageSelect
    if (!userProfile || !userProfile.language || userProfile.language === "") {
      console.log("Redirecting to LanguageSelect - no profile or language");
      navigate(createPageUrl("LanguageSelect"), { replace: true });
      return;
    }
    
    // If new user without avatar, redirect to AvatarSelect
    if (userProfile.is_new_user === true && !userProfile.avatar_id) {
      console.log("Redirecting to AvatarSelect - no avatar");
      navigate(createPageUrl("AvatarSelect"), { replace: true });
    }
  }, [isOnboardingPage, isAuthChecked, currentUser, profileLoading, userProfile, navigate]);

  // Show loading during initial auth check
  if (!isAuthChecked) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" />;
  }

  // Block rendering only for authenticated users who need onboarding
  if (!isOnboardingPage && currentUser && !profileLoading) {
    if (!userProfile || !userProfile.language || userProfile.language === "" || (userProfile.is_new_user === true && !userProfile.avatar_id)) {
      return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-2">Redirecting to onboarding...</p>
          <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>;
    }
  }
  
  return (
    <>
      {isDev && isAuthChecked && (
        <div className="fixed top-0 left-0 z-[9999] bg-black/90 text-white text-xs px-3 py-1 font-mono">
          user: {currentUser?.id?.slice(0, 8) || 'none'} | 
          role: {currentUser?.role || 'none'} | 
          lang: {userProfile?.language || 'null'} | 
          route: {currentPageName} | 
          auth: {currentUser ? 'yes' : 'no'}
        </div>
      )}
      {children}
    </>
  );
}