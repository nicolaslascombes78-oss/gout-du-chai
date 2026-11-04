// Photo (pleine largeur) ou logo d'un domaine.
// Sans image : rien, plutôt qu'une initiale qui ressemble à une image manquante.
// Logo : posé comme une étiquette sur le fond encre, au lieu d'un grand bandeau clair.
export default function DomainImage({ domain, variant = "hero" }) {
  const src = domain.photos?.[0];
  const cls = `dom-img dom-img-${variant}`;

  if (!src) return null;

  if (domain.photo_logo) {
    return (
      <figure className={`${cls} is-logo`}>
        <span className="logo-plate" style={{ background: domain.photo_bg || "#ffffff" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={domain.name} loading={variant === "hero" ? "eager" : "lazy"} decoding="async" />
        </span>
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
