import type { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
      authorization: { params: { scope: 'identify email guilds' } },
    }),
  ],
  callbacks: {
    /**
     * À chaque connexion, on synchronise le user avec notre API (DB).
     * C'est ici qu'on persiste le profil Discord dans PostgreSQL.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'discord' || !profile) return true;
      try {
        await fetch(`${API_URL}/auth/discord`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: (profile as any).id,
            username: (profile as any).username,
            email: (profile as any).email,
            avatar: (profile as any).avatar,
          }),
        });
      } catch (err) {
        console.error('[next-auth] signIn: failed to sync user to API', err);
      }
      return true;
    },
    async session({ session, token }) {
      (session.user as any).discordId = token.sub;
      (session.user as any).id = token.sub;
      return session;
    },
    async jwt({ token, profile }) {
      if (profile?.sub) token.sub = (profile as any).sub;
      return token;
    },
  },
  pages: {
    signIn: '/',
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
};