import Link from "next/link";
import { redirect } from "next/navigation";
import JoinForm from "@/components/JoinForm";

export default async function Rejoindre({ searchParams }) {
  const params = await searchParams;
  const code = (params?.code || "").toString().trim().toUpperCase();
  if (!code) redirect("/");

  return (
    <main className="shell">
      <p className="brand">
        <Link href="/">Le Goût du Chai</Link>
      </p>
      <h1>Bienvenue dans le cercle</h1>
      <p className="lead">
        Quelques informations, et nous vous envoyons votre code d&apos;accès par e-mail. Pas de mot de passe à retenir.
      </p>
      <div className="ornament" />
      <section className="card">
        <JoinForm code={code} />
      </section>
    </main>
  );
}
