"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const baseLinks = [
  { href: "/dashboard", label: "Eventos" },
  { href: "/venues", label: "Centros" },
  { href: "/persons", label: "Personas" },
  { href: "/settings", label: "Ajustes" },
];

export function NavLinks({ showMyEvents }: { showMyEvents?: boolean }) {
  const pathname = usePathname();

  const links = showMyEvents
    ? [...baseLinks, { href: "/my-events", label: "Mis eventos" }]
    : baseLinks;

  return (
    <nav className="flex items-center gap-1">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-white/20 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
