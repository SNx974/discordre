import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MatchStatus, type MatchStatus as MatchStatusType } from '@matchmaking/shared';

const STATUS_LABELS: Record<MatchStatusType, string> = {
  PENDING: 'En attente',
  AWAITING_PLAYERS: 'À rejoindre',
  IN_PROGRESS: 'En cours',
  RESULT_PENDING: 'Screenshot en cours',
  AWAITING_VALIDATION: 'À valider',
  DISPUTED: 'Litige',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

const STATUS_VARIANTS: Record<MatchStatusType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'outline',
  AWAITING_PLAYERS: 'secondary',
  IN_PROGRESS: 'default',
  RESULT_PENDING: 'secondary',
  AWAITING_VALIDATION: 'default',
  DISPUTED: 'destructive',
  COMPLETED: 'default',
  CANCELLED: 'outline',
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  let matches: any[] = [];
  let teams: any[] = [];
  try {
    const [matchesRes, teamsRes] = await Promise.all([
      api.get<any[]>('/matches', session),
      api.get<any[]>('/teams', session),
    ]);
    matches = matchesRes;
    teams = teamsRes;
  } catch (err) {
    console.error('Dashboard data fetch failed', err);
  }

  return (
    <main className="container py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Connecté en tant que <span className="font-medium text-foreground">{(session.user as any).name}</span>
          </p>
        </div>
        <Button asChild>
          <Link href="/matches/new">+ Nouveau match</Link>
        </Button>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">Matchs récents</h2>
        {matches.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Aucun match pour l'instant. Crée le premier !
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((m: any) => (
              <Link key={m.id} href={`/matches/${m.id}`}>
                <Card className="p-5 transition hover:border-primary">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{m.game} · {m.format}</span>
                    <Badge variant={STATUS_VARIANTS[m.status as MatchStatusType]}>
                      {STATUS_LABELS[m.status as MatchStatusType] ?? m.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between font-medium">
                    <span>{m.teamA?.tag ?? m.teamAId}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span>{m.teamB?.tag ?? m.teamBId}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Équipes ({teams.length})</h2>
        {teams.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Aucune équipe encore. <Link href="/teams/new" className="text-primary underline">Créer une équipe</Link>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            {teams.map((t: any) => (
              <Card key={t.id} className="p-4">
                <div className="font-bold">{t.tag}</div>
                <div className="text-sm text-muted-foreground">{t.name}</div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}