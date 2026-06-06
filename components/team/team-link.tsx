"use client";

export default function TeamLink({ teamId, name, flag, className = "" }: { teamId: string; name: string; flag?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold ${className}`}
    >
      {flag && <span className="text-xl align-middle select-none">{flag}</span>}
      <span className="truncate">{name}</span>
    </span>
  );
}
