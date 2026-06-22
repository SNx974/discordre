import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, Users, MessageSquare, ScanLine } from 'lucide-react';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">Matchmaking</span>
        </div>
        <nav className="flex gap-3">
          {session ? (
            <Button asChild>
              <Link href="/dashboard">Dashboard →</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/api/auth/signin">Se connecter avec Discord</Link>
            </Button>
          )}
        </nav>
      </header>

      <section className="container py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
          La plateforme e-sport <span className="text-primary">synchronisée Discord</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Crée des matchs, discute avec ton équipe dans un channel privé auto-généré,
          soumets tes screenshots, et valide les résultats avec consentement mutuel.
        </p>
      </section>

      <section className="container grid gap-6 pb-20 md:grid-cols-3">
        <FeatureCard
          icon={<MessageSquare className="h-6 w-6" />}
          title="Chat temps réel"
          description="Le mirror de Discord dans ton navigateur, latence sub-seconde."
        />
        <FeatureCard
          icon={<ScanLine className="h-6 w-6" />}
          title="OCR automatique"
          description="Upload un screenshot, l'IA extrait le score. Pas de triche possible."
        />
        <FeatureCard
          icon={<Users className="h-6 w-6" />}
          title="Validation mutuelle"
          description="Les deux équipes doivent valider. Désaccord → escalade admin."
        />
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="p-6">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}