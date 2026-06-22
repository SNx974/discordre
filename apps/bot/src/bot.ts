import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { logger } from './logger';
import { config } from './config';
import { ChannelManager } from './services/channel-manager';
import { ApiClient } from './services/api-client';
import { registerReady } from './events/ready';
import { registerMessageCreate } from './events/message-create';
import { registerInteractionCreate } from './events/interaction-create';
import { buildValidationButtons } from './events/interaction-create';
import { startBotWorker } from './workers/bot-worker';
import { EmbedBuilder } from 'discord.js';

export interface MatchContext {
  matchId: string;
  channelId: string;
}

export class Bot {
  public client: Client;
  public channelManager = new ChannelManager();
  public matchChannels = new Map<string, MatchContext>(); // discordChannelId → context
  public api: ApiClient;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
    });
    this.api = new ApiClient();
  }

  async start() {
    registerReady(this);
    registerMessageCreate(this);
    registerInteractionCreate(this);

    this.client.on('error', (err) => logger.error({ err }, 'Discord client error'));
    this.client.on('warn', (msg) => logger.warn({ msg }, 'Discord client warning'));

    await this.client.login(config.discord.token);
    startBotWorker(this);
  }

  // ─── Handlers de jobs ───────────────────────────────────────

  async handleCreateChannel(matchId: string) {
    // 1) Récupère le match via l'API (ou via Prisma si le bot avait accès direct)
    const match: any = await this.api.call(`/internal/match/${matchId}`, { method: 'GET' });
    if (!match) throw new Error(`Match ${matchId} not found`);

    const guild = this.client.guilds.cache.get(config.discord.guildId);
    if (!guild) throw new Error(`Guild ${config.discord.guildId} not found`);

    // 2) Liste les Discord IDs à autoriser (joueurs A + B)
    const allowedIds = [
      ...match.players.filter((p: any) => p.teamSide === 'A').map((p: any) => p.user.discordId),
      ...match.players.filter((p: any) => p.teamSide === 'B').map((p: any) => p.user.discordId),
    ];

    // 3) Crée le channel
    const channel = await this.channelManager.createMatchChannel({
      guild,
      categoryId: config.discord.matchCategoryId || null,
      channelName: `match-${match.teamA.tag}-vs-${match.teamB.tag}`.toLowerCase(),
      topic: `Match ${match.id} • ${match.game} • ${match.format}`,
      allowedUserIds: allowedIds,
      botUserId: this.client.user!.id,
      adminRoleId: config.discord.adminRoleId || undefined,
    });

    // 4) Mémorise le mapping pour la détection d'images
    this.matchChannels.set(channel.id, { matchId, channelId: channel.id });

    // 5) Notifie l'API
    await this.api.notifyChannelCreated(matchId, channel.id, guild.id);

    // 6) Embed d'accueil + DM aux joueurs avec lien d'invitation
    const embed = this.channelManager.buildMatchEmbed(match);
    await channel.send({ embeds: [embed as any] });

    for (const player of match.players) {
      try {
        const invite = await channel.createInvite({ maxUses: 1, unique: true, reason: 'Match invitation' });
        const member = await guild.members.fetch(player.user.discordId).catch(() => null);
        if (member) {
          await member.send({
            content: `🎮 Ton match **${match.teamA.tag} vs ${match.teamB.tag}** est prêt : ${invite.url}`,
          });
        }
      } catch (err) {
        logger.warn({ err, discordId: player.user.discordId }, 'Failed to DM player');
      }
    }

    logger.info({ matchId, channelId: channel.id }, 'Match channel created');
  }

  async handlePostMatchEmbed(matchId: string) {
    // no-op pour l'instant (géré dans handleCreateChannel)
  }

  async handleArchiveChannel(matchId: string) {
    const ctx = [...this.matchChannels.entries()].find(([, v]) => v.matchId === matchId);
    if (!ctx) return;
    const [, meta] = ctx;
    const channel = this.client.channels.cache.get(meta.channelId);
    if (channel && channel.isTextBased()) {
      await this.channelManager.archive(channel as any, 60_000);
    }
    this.matchChannels.delete(meta.channelId);
    logger.info({ matchId }, 'Channel archived');
  }

  async handleNotifyResultReady(matchId: string, resultId: string) {
    const ctx = [...this.matchChannels.entries()].find(([, v]) => v.matchId === matchId);
    if (!ctx) return;
    const channel = this.client.channels.cache.get(ctx[1].channelId);
    if (!channel?.isTextBased()) return;

    // Récupère le résultat
    const result: any = await this.api.call(`/internal/result/${resultId}`, { method: 'GET' });

    const embed = new EmbedBuilder()
      .setTitle('📊 Résultat détecté par l\'OCR')
      .setColor(0x22c55e)
      .addFields(
        { name: 'Team A', value: `${result.scoreA}`, inline: true },
        { name: 'Team B', value: `${result.scoreB}`, inline: true },
        { name: 'Confiance OCR', value: `${Math.round((result.ocrConfidence ?? 0) * 100)}%`, inline: true },
      )
      .setImage(result.screenshotUrl)
      .setFooter({ text: 'Cliquez sur ✅ pour valider ou ❌ pour contester' });

    await (channel as any).send({
      embeds: [embed],
      components: [buildValidationButtons(resultId)],
    });
  }

  async handleNotifyValidationUpdate(matchId: string) {
    const ctx = [...this.matchChannels.entries()].find(([, v]) => v.matchId === matchId);
    if (!ctx) return;
    const channel = this.client.channels.cache.get(ctx[1].channelId);
    if (!channel?.isTextBased()) return;
    await (channel as any).send(`🔔 Statut de validation mis à jour. Voir le panel web : http://localhost:3000/matches/${matchId}`);
  }
}