import {
  ChannelType,
  Guild,
  GuildMember,
  PermissionFlagsBits,
  TextChannel,
  NewsChannel,
  CategoryChannel,
  OverwriteResolvable,
} from 'discord.js';

interface CreateChannelOpts {
  guild: Guild;
  categoryId: string | null;
  channelName: string;
  topic?: string;
  allowedUserIds: string[]; // Discord IDs des joueurs
  botUserId: string;
  adminRoleId?: string;
}

export class ChannelManager {
  /**
   * Crée un channel textuel privé avec overwrites calculés dynamiquement.
   * Renvoie le channel créé.
   */
  async createMatchChannel(opts: CreateChannelOpts): Promise<TextChannel> {
    const overwrites: OverwriteResolvable[] = [
      // @everyone : pas accès
      { id: opts.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    ];

    // Joueurs autorisés
    for (const userId of opts.allowedUserIds) {
      overwrites.push({
        id: userId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.AddReactions,
          PermissionFlagsBits.UseExternalEmojis,
        ],
      });
    }

    // Admins
    if (opts.adminRoleId) {
      overwrites.push({
        id: opts.adminRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    }

    // Le bot lui-même
    overwrites.push({
      id: opts.botUserId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    });

    const channel = await opts.guild.channels.create({
      name: opts.channelName,
      type: ChannelType.GuildText,
      parent: opts.categoryId ?? undefined,
      topic: opts.topic,
      permissionOverwrites: overwrites,
    });

    return channel;
  }

  /**
   * Archive le channel : le rend invisible aux joueurs, le rename en [archive]…, planifie la suppression.
   */
  async archive(channel: TextChannel, delayMs = 60_000): Promise<void> {
    try {
      await channel.setName(`[archive] ${channel.name}`);
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
        ViewChannel: false,
      });
      setTimeout(async () => {
        try {
          await channel.delete('Match archived');
        } catch (e) {
          // already deleted
        }
      }, delayMs);
    } catch (e) {
      // ignore
    }
  }

  buildMatchEmbed(match: any): unknown {
    return {
      title: `🎮 ${match.teamA?.tag ?? 'TBA'} vs ${match.teamB?.tag ?? 'TBA'}`,
      description: `**${match.game}** · ${match.format}`,
      color: 0x22c55e,
      fields: [
        { name: 'Match ID', value: match.id, inline: false },
        { name: 'Team A', value: match.teamA?.name ?? 'TBA', inline: true },
        { name: 'Team B', value: match.teamB?.name ?? 'TBA', inline: true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Matchmaking e-sport platform' },
    };
  }
}