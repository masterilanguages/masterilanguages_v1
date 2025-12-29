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
      return profiles[0] || null;
    },
    staleTime: 5 * 60 * 1000,
    enabled: isAuthChecked && !!currentUser,
  });

  // Debug label (dev only)
  const isDev = window.location.hostname === 'localhost' || window.location.hostname.includes('dev');
  
  // HARD BLOCK: Don't render anything except onboarding if language not set
  // This applies to ALL users regardless of role
  useEffect(() => {
    if (isOnboardingPage || !isAuthChecked || profileLoading) return;
    
    if (!userProfile || !userProfile.language || userProfile.language === "") {
      if (currentPageName !== "LanguageSelect") {
        navigate(createPageUrl("LanguageSelect"), { replace: true });
      }
      return;
    }
    
    if (userProfile.is_new_user === true && !userProfile.avatar_id) {
      if (currentPageName !== "AvatarSelect") {
        navigate(createPageUrl("AvatarSelect"), { replace: true });
      }
    }
  }, [isOnboardingPage, isAuthChecked, profileLoading, userProfile, currentPageName, navigate]);

  // Block rendering if onboarding needed
  const shouldBlockRender = !isOnboardingPage && isAuthChecked && !profileLoading && 
    (!userProfile || !userProfile.language || 
     (userProfile.is_new_user === true && !userProfile.avatar_id));
  
  if (shouldBlockRender) {
    return null;
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