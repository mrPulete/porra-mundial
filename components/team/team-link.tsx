"use client";

import Link from "next/link";

export default function TeamLink({ teamId, name, flag, className = "" }: { teamId: string; name: string; flag?: string; className?: string }) {
  return (
    <Link
      href={`/teams/${encodeURIComponent(teamId)}`}
      className={`inline-flex items-center gap-1 font-semibold hover:underline focus:outline-none focus-visible:ring-2 ring-emerald-400 ${className}`}
    >
      {flag && <span className="text-xl align-middle select-none">{flag}</span>}
      <span className="truncate">{name}</span>
    </Link>
  );
}
