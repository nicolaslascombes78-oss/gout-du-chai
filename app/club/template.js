import styles from "./template.module.css";

// Fondu doux à chaque changement de page dans le club.
// Contrairement au layout, ce gabarit est recréé à chaque navigation, ce qui relance l'animation.
export default function ClubTemplate({ children }) {
  return <div className={styles.fade}>{children}</div>;
}
