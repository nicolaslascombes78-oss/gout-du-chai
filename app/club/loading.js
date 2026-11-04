// Affiché instantanément pendant le chargement d'un onglet du club.
export default function Loading() {
  return (
    <main className="shell" aria-busy="true" aria-label="Chargement">
      <div className="sk sk-line" style={{ width: "40%", margin: "8px auto 0" }} />
      <div className="sk sk-title" />
      <div className="ornament" />
      <div className="sk sk-card" />
      <div className="sk sk-card" />
      <div className="sk sk-card short" />
    </main>
  );
}
