'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { WsEvents } from '@matchmaking/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface Message {
  id: string;
  authorId: string;
  authorUsername: string;
  content: string;
  attachments: Array<{ url: string; filename: string; contentType?: string }>;
  createdAt: string;
}

interface Props {
  matchId: string;
}

export function ChatWindow({ matchId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000', {
      auth: { token: localStorage.getItem('auth_token') },
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit(WsEvents.JOIN_MATCH_ROOM, { matchId });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on(WsEvents.MATCH_MESSAGE_NEW, (msg: Message) => {
      setMessages((s) => [...s, msg]);
    });

    return () => {
      socket.emit(WsEvents.LEAVE_MATCH_ROOM, { matchId });
      socket.disconnect();
    };
  }, [matchId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage() {
    if (!input.trim()) return;
    // Sprint 3 : POST /matches/:id/messages qui relaie via bot → Socket.io broadcast
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/matches/${matchId}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input }),
    }).catch(() => {});
    setInput('');
  }

  return (
    <Card className="flex h-[500px] flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <span className="font-semibold">Chat du match</span>
        <span className={`text-xs ${connected ? 'text-green-500' : 'text-muted-foreground'}`}>
          {connected ? '● connecté' : '○ déconnecté'}
        </span>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Aucun message. Le mirror Discord apparaîtra ici en temps réel.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="font-medium text-primary">{m.authorUsername}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {new Date(m.createdAt).toLocaleTimeString('fr-FR')}
            </span>
            <p className="whitespace-pre-wrap">{m.content}</p>
            {m.attachments.map((a) => (
              <a key={a.url} href={a.url} target="_blank" className="text-xs text-primary underline">
                📎 {a.filename}
              </a>
            ))}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <footer className="flex gap-2 border-t p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Écrire un message…"
        />
        <Button onClick={sendMessage}>Envoyer</Button>
      </footer>
    </Card>
  );
}