import BottomNav from "@/components/BottomNav";

// Toutes les pages du club partagent la barre de navigation du bas.
export default function ClubLayout({ children }) {
  return (
    <div className="club-app">
      {children}
      <BottomNav />
    </div>
  );
}
