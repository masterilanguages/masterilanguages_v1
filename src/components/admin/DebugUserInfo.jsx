import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function DebugUserInfo() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {}
    };
    fetchUser();
  }, []);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    },
  });

  // Only show for admin users
  if (currentUser?.role !== 'admin') return null;

  return (
    <div className="fixed top-20 left-4 bg-black/90 text-white text-xs p-2 rounded-lg border border-white/20 font-mono z-50">
      <div className="flex items-center gap-3">
        <div><span className="text-gray-400">ID:</span> {currentUser?.id?.slice(0, 6)}</div>
        <div><span className="text-gray-400">Role:</span> <span className={currentUser?.role === 'admin' ? 'text-red-400' : 'text-green-400'}>{currentUser?.role || 'none'}</span></div>
        <div><span className="text-gray-400">Lang:</span> <span className={userProfile?.language ? 'text-cyan-400' : 'text-red-400'}>{userProfile?.language || 'NULL'}</span></div>
        <div><span className="text-gray-400">New:</span> <span className={userProfile?.is_new_user ? 'text-yellow-400' : 'text-green-400'}>{userProfile?.is_new_user ? 'Y' : 'N'}</span></div>
        <div><span className="text-gray-400">Route:</span> <span className="text-blue-400">{window.location.pathname}</span></div>
      </div>
    </div>
  );
}