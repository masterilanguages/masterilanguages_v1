"use client";

/**
 * react-router-dom compatibility shim for Next.js App Router.
 *
 * The ported Base44 portal code imports `useNavigate`, `useLocation`,
 * `useParams`, `Link`, and `createPageUrl` from react-router. This module
 * re-exports Next-native equivalents under the same names so that code can be
 * ported with minimal edits.
 *
 * Page-URL convention:
 *   The Vite origin used `createPageUrl(name) => '/' + name.toLowerCase().replace(/ /g, '-')`
 *   (e.g. "Home" -> "/home"). In the Next migration the portal lives under
 *   /portal/*, so we prefix that segment while preserving the origin's
 *   name->slug transform (e.g. "Home" -> "/portal/home").
 */

import NextLink from "next/link";
import {
  useRouter,
  usePathname,
  useSearchParams,
  useParams as useNextParams,
} from "next/navigation";
import React from "react";

// Base44 page name (lowercased) -> real portal route. The migration moved pages
// into a nested IA (songs/singing/lessons under /learn, etc.), so the origin's
// naive "name -> /portal/<slug>" no longer holds. This table is the single
// source of truth for cross-page navigation; unmapped names fall back to slug.
const PAGE_ROUTES: Record<string, string> = {
  // dashboard
  home: "/portal/dashboard",
  dashboard: "/portal/dashboard",
  myprogram: "/portal/dashboard/my-program",
  fluentpath: "/portal/dashboard/fluent-path",
  level1world: "/portal/dashboard/level1-world",
  // learn / video transcription
  learn: "/portal/learn",
  videos: "/portal/learn",
  // songs / singing
  songs: "/portal/learn/songs",
  songlistenpage: "/portal/learn/songs/listen",
  singinghome: "/portal/learn/singing",
  singinglesson: "/portal/learn/singing/lesson",
  // lessons
  lessons: "/portal/learn/lessons",
  bodypartslesson: "/portal/learn/lessons/body-parts",
  colorslesson: "/portal/learn/lessons/colors",
  colorstest: "/portal/learn/lessons/colors-test",
  dayslesson: "/portal/learn/lessons/days-lesson",
  days: "/portal/learn/lessons/days",
  monthslesson: "/portal/learn/lessons/months",
  pictures: "/portal/learn/lessons/pictures",
  pictureslesson2: "/portal/learn/lessons/pictures2",
  sentences: "/portal/learn/lessons/sentences",
  // practice / speaking
  practice: "/portal/practice",
  speakingsession: "/portal/practice",
  speakaudio: "/portal/practice/speak-audio",
  dictationexercise: "/portal/practice/dictation",
  sessionflow: "/portal/practice/session-flow",
  // backpack / vocab (live at /portal/library)
  backpack: "/portal/library",
  wordbank: "/portal/library",
  wordsiknow: "/portal/library",
  flashcards: "/portal/library/flashcards",
  // media library (the Base44 "Library"/"MediaLibrary" pages live at /portal/media)
  library: "/portal/media",
  medialibrary: "/portal/media",
  babyvideos: "/portal/media/baby",
  // journal
  journal: "/portal/journal",
  session1journal: "/portal/journal/session1",
  // progress / store
  progress: "/portal/progress",
  store: "/portal/progress/store",
  // onboarding
  languageselect: "/portal/onboarding/language",
  avatarselect: "/portal/onboarding/avatar",
};

// Resolve a react-router-style target (bare "Name", "/Name", "Name?q=1", or an
// already-real "/portal/..." path) into the correct Next href.
function resolveHref(to: string): string {
  if (!to) return "/portal/dashboard";
  // Split off query/hash so it survives the mapping.
  const qIndex = to.search(/[?#]/);
  const pathPart = qIndex >= 0 ? to.slice(0, qIndex) : to;
  const suffix = qIndex >= 0 ? to.slice(qIndex) : "";

  // Already a real portal path -> unchanged.
  if (pathPart.startsWith("/portal")) return to;

  const key = pathPart.replace(/^\//, "").replace(/^portal\//, "").toLowerCase();

  // Known Base44 page name (whether passed bare or as "/Name").
  if (PAGE_ROUTES[key]) return PAGE_ROUTES[key] + suffix;

  // Other absolute paths (e.g. "/login") -> leave untouched.
  if (pathPart.startsWith("/")) return to;

  // Bare unknown name -> origin's naive slug under /portal.
  return "/portal/" + key.replace(/ /g, "-") + suffix;
}

// createPageUrl(name) -> real portal href (table-mapped, query-preserving).
export function createPageUrl(name: string): string {
  return resolveHref(String(name || ""));
}

// useNavigate() -> (to, opts?) => void. Routes every target through the same
// resolver so cross-page links land on the real nested routes.
export function useNavigate() {
  const router = useRouter();
  return (to: string, opts?: { replace?: boolean }) => {
    const href = resolveHref(to);
    if (opts?.replace) {
      router.replace(href);
    } else {
      router.push(href);
    }
  };
}

// useLocation() -> { pathname, search }
export function useLocation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  return {
    pathname: pathname || "",
    search: search ? `?${search}` : "",
  };
}

// useParams() -> route params object (Next provides this for dynamic segments).
export function useParams() {
  return (useNextParams() as Record<string, string>) || {};
}

// Link — wraps next/link but accepts react-router's `to` prop (and `href`).
type LinkProps = Omit<
  React.ComponentProps<typeof NextLink>,
  "href"
> & {
  to?: string;
  href?: string;
};

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  function Link({ to, href, ...rest }, ref) {
    const target = to ?? href ?? "#";
    return <NextLink ref={ref} href={target} {...rest} />;
  }
);
