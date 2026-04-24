const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const SessionLog = require('../../models/sessionlog');
const Settings = require('../../models/settings');
const { activeStartupSessions } = require('../slash/startup');

const DEFAULT_OVER_EMBED = {
  title: 'Greenville Life Roleplay - __Session Over__ :blue_butterflies:',
  description: [
    '<:blue_bow:1487528994307051530> [User] Has now ended their session. We hope you enjoyed it and another one will be hosted shortly, thank you for joining!',
    '',
    '<:blue_arrow:1489774422767439924> **Reminder:** There is a 20 minute cool down until the next session.'
  ].join('\n'),
  image: 'https://media.discordapp.net/attachments/1471648998266769468/1490185130961014994/image-25.png?ex=69ecd7cd&is=69eb864d&hm=36a82cbdf01da9d2c4698ad54bc102a32d1154749ee394b807392a1d49056bcd&=&format=webp&quality=lossless&width=2118&height=1248'
};

function renderTemplate(value, userId, note) {
  return (value || '')
    .replace(/\$user|\[user\]|\[User\]/g, `<@${userId}>`)
    .replace(/\$notes|\[notes\]|\[Notes\]/g, note || '');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('over')
    .setDescription('End the session')
    .addStringOption(option =>
      option.setName('notes')
        .setDescription('How was the session')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const settings = await Settings.findOne({ guildId: interaction.guild.id });
      const embedColor = settings?.embedcolor || '#ab6cc4';
      const allowedRoleIds = [settings?.staffRoleId, settings?.adminRoleId].filter(Boolean);

      if (!interaction.member.roles.cache.some(role => allowedRoleIds.includes(role.id))) {
        return await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription('You do not have the required role to use this command.')
              .setColor(embedColor)
          ],
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const userId = interaction.user.id;
      const note = interaction.options.getString('notes') || '';
      const channel = interaction.channel;

      const sessionEntry = [...activeStartupSessions.entries()]
        .find(([id, data]) => data.userId === userId && data.type === 'session');

      if (!sessionEntry) {
        return await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Data not found')
              .setDescription('No active session found. Please use `/settings` to configure the Embed.')
              .setColor(embedColor)
          ]
        });
      }

      const [sessionId, sessionData] = sessionEntry;

      await SessionLog.create({
        guildId: interaction.guild.id,
        sessiontype: sessionData.type,
        sessionId,
        userId: sessionData.userId,
        timestarted: sessionData.timestamp,
        timeended: new Date()
      });

      activeStartupSessions.delete(sessionId);

      const endEmbedTemplate = settings?.overEmbed || {};
      const overTitle = endEmbedTemplate.title || DEFAULT_OVER_EMBED.title;
      const overDescription = endEmbedTemplate.description || DEFAULT_OVER_EMBED.description;
      const overImage = endEmbedTemplate.image || DEFAULT_OVER_EMBED.image;
      const endEmbed = new EmbedBuilder()
        .setTitle(renderTemplate(overTitle, userId, note))
        .setDescription(renderTemplate(overDescription, userId, note))
        .setColor(embedColor)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

      if (overImage?.startsWith('http')) endEmbed.setImage(overImage);
      if (endEmbedTemplate.thumbnail?.startsWith('http')) endEmbed.setThumbnail(endEmbedTemplate.thumbnail);

      const button = new ButtonBuilder()
        .setCustomId('feedback')
        .setLabel('Feedback Form')
        .setStyle(ButtonStyle.Primary);
      const actionRow = new ActionRowBuilder().addComponents(button);

      await channel.send({ embeds: [endEmbed], });

      await interaction.editReply({ content: 'Session ended successfully.' });

      let logChannel;
      try { logChannel = await interaction.client.channels.fetch(settings?.logChannelId || '1419318345731411968'); } catch { logChannel = null; }

      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('Session Ended')
          .setDescription(`Session was ended by ${interaction.user.tag}`)
          .addFields(
            { name: 'Host', value: `<@${userId}>`, inline: true },
            { name: 'Channel', value: `${channel.name} (${channel.id})`, inline: true },
            { name: 'Message Link', value: `[Jump to Message](${channel.lastMessage?.url || ''})`, inline: true }
          )
          .setColor(embedColor)
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });
        await logChannel.send({ embeds: [logEmbed] });
      }

    } catch (error) {
      const embedColor = (await Settings.findOne({ guildId: interaction.guild.id }))?.embedcolor || '#ab6cc4';
      const errorEmbed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription(`There was an error executing the command.\n\`\`\`${error.message}\`\`\``)
        .setColor(embedColor);

      try {
        if (!interaction.replied && !interaction.deferred)
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        else
          await interaction.editReply({ embeds: [errorEmbed] });
      } catch {}

      let logChannel;
      try { logChannel = await interaction.client.channels.fetch('1419318345731411968'); } catch { logChannel = null; }
      if (logChannel) {
        const errorLogEmbed = new EmbedBuilder()
          .setTitle('Session Ended Command Error')
          .setDescription(`Command run by ${interaction.user.tag} failed.\n\`\`\`${error.message}\`\`\``)
          .setColor(embedColor);
        await logChannel.send({ embeds: [errorLogEmbed] });
      }
    }
  }
};
