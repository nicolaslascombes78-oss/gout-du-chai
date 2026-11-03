"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";

const TABS = [
  {
    href: "/club",
    label: "Club",
    match: (p) => p === "/club",
    icon: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" />,
  },
  {
    href: "/club/selection",
    label: "Sélection",
    match: (p) => p.startsWith("/club/selection") || p.startsWith("/club/domaine"),
    icon: <path d="M8 3h8l-.6 6.2A3.4 3.4 0 0 1 12 12.3a3.4 3.4 0 0 1-3.4-3.1zM12 12.3V20M8.5 20.5h7" />,
  },
  {
    href: "/club/panier",
    label: "Panier",
    match: (p) => p.startsWith("/club/panier"),
    icon: <path d="M4 7h16l-1.5 11.2a2 2 0 0 1-2 1.8h-9a2 2 0 0 1-2-1.8zM9 7V5.5a3 3 0 0 1 6 0V7" />,
  },
  {
    href: "/club/membre",
    label: "Membre",
    match: (p) => p.startsWith("/club/membre"),
    icon: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />,
  },
];

export default function BottomNav() {
  const pathname = usePathname() || "";
  const { count } = useCart();
  return (
    <nav className="bottom-nav" aria-label="Navigation du club">
      {TABS.map((t) => {
        const on = t.match(pathname);
        const badge = t.href === "/club/panier" && count > 0;
        return (
          <Link key={t.href} href={t.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>
            <span className="nav-icon">
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {t.icon}
              </svg>
              {badge && (
                <span className="nav-badge" aria-label={`${count} cuvée(s) à confirmer`}>
                  {count}
                </span>
              )}
            </span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
