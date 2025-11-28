import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Volume2, LayoutDashboard, Library, Sparkles, PlayCircle, MessageSquare, Search, X } from "lucide-react";
import QuickAddWord from "./components/QuickAddWord";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

const hebrewItems = [
  {
    title: "Home",
    url: createPageUrl("Home"),
    icon: LayoutDashboard,
  },
  {
    title: "Words",
    url: createPageUrl("Practice"),
    icon: Volume2,
  },
  {
    title: "Sentences",
    url: createPageUrl("Sentences"),
    icon: MessageSquare,
  },
  {
    title: "Videos",
    url: createPageUrl("Videos"),
    icon: PlayCircle,
  },
  {
    title: "Schedule",
    url: createPageUrl("Progress"),
    icon: LayoutDashboard,
  },
  {
    title: "Treasure",
    url: createPageUrl("Store"),
    icon: Sparkles,
  },
  {
    title: "Library",
    url: createPageUrl("Library"),
    icon: Library,
  },
];

const spanishItems = [
  {
    title: "Practice",
    url: createPageUrl("SpanishPractice"),
    icon: Volume2,
  },
  {
    title: "Videos",
    url: createPageUrl("SpanishVideos"),
    icon: PlayCircle,
  },
  {
    title: "Progress",
    url: createPageUrl("SpanishProgress"),
    icon: LayoutDashboard,
  },
  {
    title: "Library",
    url: createPageUrl("SpanishLibrary"),
    icon: Library,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [hebrewOpen, setHebrewOpen] = React.useState(true);
  const [spanishOpen, setSpanishOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const words = await base44.entities.Word.list();
      const q = query.toLowerCase();
      setSearchResults(words.filter(w => 
        w.word?.toLowerCase().includes(q) || 
        w.phonetic?.toLowerCase().includes(q) || 
        w.translation?.toLowerCase().includes(q)
      ).slice(0, 8));
    } else {
      setSearchResults([]);
    }
  };

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --primary: 262 83% 58%;
          --primary-foreground: 210 40% 98%;
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-violet-50 via-white to-blue-50">
        <Sidebar className="border-r border-violet-100/50 backdrop-blur-sm bg-white/80">
          <SidebarHeader className="border-b border-violet-100/50 p-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-blue-500 rounded-2xl flex items-center justify-center">
                                      <span className="text-white font-bold text-xl">m</span>
                                    </div>
                                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
                                  </div>
              <div>
                <h2 className="font-bold text-xl bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">Masteri Languages</h2>
                                      <p className="text-xs text-gray-500">Master any language</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <Collapsible open={hebrewOpen} onOpenChange={setHebrewOpen}>
              <SidebarGroup>
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-3 flex items-center justify-between cursor-pointer hover:bg-violet-50 rounded-lg">
                    <span>🇮🇱 Hebrew</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${hebrewOpen ? 'rotate-180' : ''}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu className="space-y-1">
                      {hebrewItems.map((item) => (
                        <SidebarMenuItem key={`hebrew-${item.title}`}>
                          <SidebarMenuButton 
                            asChild 
                            className={`hover:bg-violet-50 hover:text-violet-700 transition-all duration-200 rounded-xl ${
                              location.pathname === item.url ? 'bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:from-violet-600 hover:to-blue-600 hover:text-white shadow-lg' : ''
                            }`}
                          >
                            <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                              <item.icon className="w-5 h-5" />
                              <span className="font-medium">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            <Collapsible open={spanishOpen} onOpenChange={setSpanishOpen}>
              <SidebarGroup>
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-3 flex items-center justify-between cursor-pointer hover:bg-orange-50 rounded-lg">
                    <span>🇪🇸 Spanish</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${spanishOpen ? 'rotate-180' : ''}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu className="space-y-1">
                      {spanishItems.map((item) => (
                        <SidebarMenuItem key={`spanish-${item.title}`}>
                          <SidebarMenuButton 
                            asChild 
                            className={`hover:bg-orange-50 hover:text-orange-700 transition-all duration-200 rounded-xl ${
                              location.pathname === item.url ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 hover:text-white shadow-lg' : ''
                            }`}
                          >
                            <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                              <item.icon className="w-5 h-5" />
                              <span className="font-medium">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col">
                        <header className="bg-white/60 backdrop-blur-md border-b border-violet-100/50 px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="md:hidden">
                                <SidebarTrigger className="hover:bg-violet-50 p-2 rounded-lg transition-colors duration-200" />
                              </div>
                              <button
                                onClick={() => setSearchOpen(!searchOpen)}
                                className="p-2 rounded-lg hover:bg-violet-50 text-gray-500 hover:text-violet-600 transition-all"
                              >
                                <Search className="w-5 h-5" />
                              </button>
                              {searchOpen && (
                                <div className="relative">
                                  <Input
                                    placeholder="Search words..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="w-48 md:w-64 text-sm"
                                    autoFocus
                                  />
                                  {searchQuery && (
                                    <button
                                      onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                  {searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-lg border border-violet-100 max-h-64 overflow-y-auto z-50">
                                      {searchResults.map(w => (
                                        <div key={w.id} className="p-3 hover:bg-violet-50 border-b border-gray-100 last:border-0">
                                          <span className="font-medium text-violet-700">{w.phonetic}</span>
                                          <span className="text-gray-400 mx-2">•</span>
                                          <span className="text-gray-600">{w.translation}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <h1 className="text-lg font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent md:hidden">Masteri</h1>
                          </div>
                        </header>

                        <div className="flex-1 overflow-auto">
                          {children}
                        </div>
                        <QuickAddWord />
                      </main>
      </div>
    </SidebarProvider>
  );
}