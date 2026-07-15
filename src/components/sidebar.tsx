"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui";

type Item = { href: string; label: string };
type Section = { title: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: "Overview",
    items: [{ href: "/", label: "Dashboard" }],
  },
  {
    title: "Core",
    items: [
      { href: "/organizations", label: "Organizations" },
      { href: "/positions", label: "Positions" },
      { href: "/employees", label: "Employees" },
      { href: "/contracts", label: "Contracts" },
    ],
  },
  {
    title: "Parties",
    items: [
      { href: "/legal-entities", label: "Legal Entities" },
      { href: "/contract-types", label: "Contract Types" },
    ],
  },
  {
    title: "Dictionaries",
    items: [
      { href: "/dictionaries/countries", label: "Countries" },
      { href: "/dictionaries/banks", label: "Banks" },
      { href: "/dictionaries/currencies", label: "Currencies" },
      { href: "/dictionaries/id-document-types", label: "ID Document Types" },
      { href: "/dictionaries/register-number-types", label: "Register Number Types" },
      { href: "/dictionaries/locations", label: "Locations" },
    ],
  },
  {
    title: "System",
    items: [{ href: "/system-state", label: "System State" }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-sm font-bold text-white">
          H
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">vibeHR</div>
          <div className="text-[11px] text-muted">HRS · adhrs</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-6">
        {SECTIONS.map((s) => (
          <div key={s.title} className="mb-4">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted/80">
              {s.title}
            </div>
            {s.items.map((it) => {
              const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "block rounded-lg px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-accent/10 font-medium text-accent"
                      : "text-foreground/80 hover:bg-black/5",
                  )}
                >
                  {it.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
