// Photo (pleine largeur) ou logo (centré sur sa couleur de fond) d'un domaine.
// Sans image : un monogramme doré, pour que chaque fiche garde son allure.
export default function DomainImage({ domain, variant = "hero" }) {
  const src = domain.photos?.[0];
  const cls = `dom-img dom-img-${variant}`;

  if (!src) {
    const initials = domain.name
      .replace(/^(Domaine|Château|Clos|Les|Le|La|Famille)\s+(de la |du |des |de l’|de l'|de |d’|d')?/i, "")
      .split(/[\s-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
    return (
      <figure className={`${cls} is-empty`} aria-hidden="true">
        <span>{initials}</span>
      </figure>
    );
  }

  if (domain.photo_logo) {
    return (
      <figure className={`${cls} is-logo`} style={{ background: domain.photo_bg || "#ffffff" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={domain.name} loading={variant === "hero" ? "eager" : "lazy"} decoding="async" />
      </figure>
    );
  }

  return (
    <figure className={cls}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={domain.name} loading={variant === "hero" ? "eager" : "lazy"} decoding="async" />
    </figure>
  );
}
