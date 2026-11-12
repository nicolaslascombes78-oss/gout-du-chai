import Link from "next/link";
import styles from "./BrandLogo.module.css";

// Logo horizontal de l'appli (thème « nuit et or ») :
// le bouchon marqué au fer, le nom en ivoire et la mention du club en or.
// Le bouchon est l'image /pwa-icon/logo, fabriquée par le code (aucun fichier image).
export default function BrandLogo() {
  return (
    <Link href="/club" className={styles.logo} aria-label="Le Goût du Chai, retour à l'accueil">
      <img src="/pwa-icon/logo" alt="" width={42} height={42} className={styles.bouchon} />
      <span className={styles.texte}>
        <span className={styles.nom}>Le Goût du Chai</span>
        <span className={styles.baseline}>
          <span className={styles.filet} aria-hidden="true" />
          Club privé d’achats groupés
        </span>
      </span>
    </Link>
  );
}
