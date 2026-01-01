import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Home, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function MediaLibraryHeader() {
  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = '/';
  };

  return (
    <div className="bg-gradient-to-r from-slate-900/95 via-purple-900/95 to-slate-900/95 backdrop-blur-xl border-b border-white/10 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" className="text-white hover:bg-white/10">
              <Home className="w-5 h-5 mr-2" />
              Home
            </Button>
          </Link>
        </div>
        
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="text-red-400 hover:bg-red-500/20"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}