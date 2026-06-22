import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional<T>(name: string, def: T): T {
  const v = process.env[name];
  return (v === undefined ? def : (v as unknown as T));
}

export const config = {
  discord: {
    token: required('DISCORD_BOT_TOKEN'),
    clientId: required('DISCORD_CLIENT_ID'),
    guildId: required('DISCORD_GUILD_ID'),
    adminRoleId: optional<string>('DISCORD_ADMIN_ROLE_ID', ''),
    matchCategoryId: optional<string>('DISCORD_MATCH_CATEGORY_ID', ''),
  },
  api: {
    url: optional<string>('API_URL', 'http://localhost:4000'),
    internalSecret: required('INTERNAL_API_SECRET'),
  },
  redis: {
    url: optional<string>('REDIS_URL', 'redis://localhost:6379'),
  },
  logLevel: optional<string>('BOT_LOG_LEVEL', 'info'),
} as const;