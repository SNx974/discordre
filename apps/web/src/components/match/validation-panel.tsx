'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

interface Props {
  matchId: string;
  results: any[];
  validations: any[];
  currentUserDiscordId: string;
}

export function ValidationPanel({ matchId, results, validations, currentUserDiscordId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function vote(resultId: string, teamSide: 'A' | 'B', decision: 'APPROVE' | 'DISPUTE') {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/validations`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId, teamSide, decision }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast({ title: decision === 'APPROVE' ? '✅ Validé' : '⚠️ Contesté', description: `Statut: ${data.status}` });
      router.refresh();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message });
    } finally {
      setLoading(false);
    }
  }

  if (results.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">Aucun résultat soumis.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((r) => {
        const myVote = validations.find((v: any) => v.resultId === r.id);
        return (
          <Card key={r.id} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold">Game {r.gameNumber}</h4>
              <Badge>{r.status}</Badge>
            </div>
            <div className="mb-3 flex items-center justify-center gap-4 text-2xl font-bold">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">A</div>
                <div>{r.scoreA}</div>
              </div>
              <div className="text-muted-foreground">—</div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">B</div>
                <div>{r.scoreB}</div>
              </div>
            </div>
            {r.screenshotUrl && (
              <a href={r.screenshotUrl} target="_blank" className="mb-3 block text-xs text-primary underline">
                Voir le screenshot
              </a>
            )}
            {r.status === 'READY' && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  disabled={loading || !!myVote}
                  onClick={() => vote(r.id, 'A', 'APPROVE')}
                >
                  ✅ Valider (A)
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={loading || !!myVote}
                  onClick={() => vote(r.id, 'B', 'DISPUTE')}
                >
                  ❌ Contester (B)
                </Button>
              </div>
            )}
            {myVote && (
              <p className="mt-2 text-xs text-muted-foreground">
                Tu as {myVote.decision === 'APPROVE' ? 'validé' : 'contesté'} (équipe {myVote.teamSide}).
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}