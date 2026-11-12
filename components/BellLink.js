"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./BellLink.module.css";

// Cloche en haut des écrans du club : mène au fil « Au club ».
// Un point doré signale qu'il s'est passé quelque chose depuis la dernière visite,
// et la cloche se balance tant que ce n'est pas lu.
export default function BellLink() {
  const pathname = usePathname();
  const [nouveau, setNouveau] = useState(false);

  useEffect(() => {
    if (pathname === "/club/activite") {
      setNouveau(false);
      return;
    }
    let annule = false;
    fetch("/api/activite", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (annule || !d?.latest) return;
        let vu = null;
        try {
          vu = localStorage.getItem("gdc-activite-vue");
        } catch {
          // stockage indisponible
        }
        setNouveau(!vu || new Date(d.latest) > new Date(vu));
      })
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, [pathname]);

  return (
    <Link
      href="/club/activite"
      className={nouveau ? `bell ${styles.sonne}` : "bell"}
      aria-label={nouveau ? "Au club : du nouveau" : "Au club"}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
      {nouveau && <span className="bell-dot" aria-hidden="true" />}
    </Link>
  );
}
