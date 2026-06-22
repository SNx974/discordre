import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { api } from '@/lib/api';
import { ChatWindow } from '@/components/match/chat-window';
import { ValidationPanel } from '@/components/match/validation-panel';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default async function MatchPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  let match: any;
  try {
    match = await api.get(`/matches/${params.id}`, session);
  } catch {
    notFound();
  }

  return (
    <main className="container grid gap-6 py-8 lg:grid-cols-3">
      <section className="lg:col-span-2 space-y-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {match.teamA.tag} <span className="text-muted-foreground">vs</span> {match.teamB.tag}
              </h1>
              <p className="text-sm text-muted-foreground">
                {match.game} · {match.format} · {new Date(match.createdAt).toLocaleString('fr-FR')}
              </p>
            </div>
            <Badge>{match.status}</Badge>
          </div>

          {match.channel && (
            <p className="mt-4 text-xs text-muted-foreground">
              💬 Channel Discord : <code>{match.channel.discordChannelId}</code>
            </p>
          )}
        </Card>

        <ChatWindow matchId={match.id} />
      </section>

      <aside className="space-y-4">
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Joueurs</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="font-medium">{match.teamA.tag}</div>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {match.players
                  .filter((p: any) => p.teamSide === 'A')
                  .map((p: any) => (
                    <li key={p.id}>{p.user.username}</li>
                  ))}
              </ul>
            </div>
            <div>
              <div className="font-medium">{match.teamB.tag}</div>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {match.players
                  .filter((p: any) => p.teamSide === 'B')
                  .map((p: any) => (
                    <li key={p.id}>{p.user.username}</li>
                  ))}
              </ul>
            </div>
          </div>
        </Card>

        <ValidationPanel
          matchId={match.id}
          results={match.results ?? []}
          validations={match.validations ?? []}
          currentUserDiscordId={(session.user as any).discordId}
        />
      </aside>
    </main>
  );
}