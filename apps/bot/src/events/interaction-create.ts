import { Events, Interaction, ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { logger } from '../logger';
import type { Bot } from '../bot';

/**
 * Boutons custom :
 *  - validate:approve:<resultId>:<teamSide>
 *  - validate:dispute:<resultId>:<teamSide>
 */
export function registerInteractionCreate(bot: Bot) {
  bot.client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    try {
      if (interaction.isButton()) {
        const [action, decision, resultId, teamSide] = interaction.customId.split(':');
        if (action !== 'validate') return;

        await interaction.deferReply({ ephemeral: true });

        const res = await fetch(`${process.env.API_URL ?? 'http://localhost:4000'}/validations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Bypass JWT pour le bot : utilise une route service-to-service
            // (Sprint 2 : ajouter /internal/bot/submit-validation signé HMAC)
            'x-bot-callback': 'true',
          },
          body: JSON.stringify({
            resultId,
            teamSide,
            decision: decision.toUpperCase(),
            validatorDiscordId: interaction.user.id,
          }),
        });

        if (!res.ok) {
          await interaction.editReply(`❌ Erreur : ${await res.text()}`);
          return;
        }

        const data: any = await res.json();

        if (data.status === 'COMPLETED') {
          await interaction.editReply('🏆 Match validé ! GG aux deux équipes.');
          // (Sprint 2 : déclencher archive channel via API)
        } else if (data.status === 'DISPUTED') {
          await interaction.editReply('⚠️ Contesté. Les admins ont été pingés.');
        } else {
          await interaction.editReply('✅ Vote enregistré. En attente de l\'autre équipe.');
        }
      } else if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'ping') {
          await interaction.reply({ content: '🏓 Pong !', ephemeral: true });
        }
      }
    } catch (err) {
      logger.error({ err }, 'interactionCreate handler crashed');
    }
  });
}

/**
 * Builder helper pour les boutons de validation sur un embed.
 */
export function buildValidationButtons(resultId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`validate:approve:${resultId}:A`)
      .setLabel('✅ Valider (A)')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`validate:approve:${resultId}:B`)
      .setLabel('✅ Valider (B)')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`validate:dispute:${resultId}:A`)
      .setLabel('❌ Contester (A)')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`validate:dispute:${resultId}:B`)
      .setLabel('❌ Contester (B)')
      .setStyle(ButtonStyle.Danger),
  );
}