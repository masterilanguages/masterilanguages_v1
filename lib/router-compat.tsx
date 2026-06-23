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

// Turn a Base44 page name into a Next route under /portal/*.
// Mirrors the origin's slug rule (lowercase + spaces->hyphens) and lets an
// already-absolute path ("/foo") pass through unchanged (just prefixed once).
export function createPageUrl(name: string): string {
  const raw = String(name || "");
  // Strip any leading slash, drop a duplicate leading "portal/" if present.
  let slug = raw.replace(/^\//, "");
  slug = slug.replace(/^portal\//, "");
  slug = slug.toLowerCase().replace(/ /g, "-");
  return "/portal/" + slug;
}

// useNavigate() -> (to, opts?) => void
// Absolute paths ("/...") navigate as-is; bare page names go through createPageUrl.
export function useNavigate() {
  const router = useRouter();
  return (to: string, opts?: { replace?: boolean }) => {
    const href = to.startsWith("/") ? to : createPageUrl(to);
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
