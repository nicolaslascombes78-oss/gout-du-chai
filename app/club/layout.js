import "@/app/ergonomie.css";
import BottomNav from "@/components/BottomNav";
import InstallBanner from "@/components/InstallBanner";

// Toutes les pages du club partagent la barre de navigation du bas.
export default function ClubLayout({ children }) {
  return (
    <div className="club-app">
      {children}
      <InstallBanner />
      <BottomNav />
    </div>
  );
}
