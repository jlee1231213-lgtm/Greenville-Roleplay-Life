const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Settings = require('../../models/settings');
const { activeStartupSessions } = require('./startup');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cohost')
    .setDescription('Cohost a session'),
  async execute(interaction) {
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const embedColor = settings?.embedcolor || '#ab6cc4';
    const allowedRoleId = settings?.staffRoleId;
    if (!allowedRoleId || !interaction.member.roles.cache.has(allowedRoleId)) return interaction.reply({ content: 'No permission', ephemeral: true });

    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.user.id;
    const timestamp = new Date();
    const sessionId = uuidv4();
    activeStartupSessions.set(sessionId, { userId, timestamp, type: 'cohost' });

    const latestStartup = [...activeStartupSessions.entries()]
      .filter(([id, data]) => data.type === 'session')
      .sort((a, b) => b[1].timestamp - a[1].timestamp)[0];

    let replyTarget;
    if (latestStartup) {
      const [id, data] = latestStartup;
      if (data.messageId) {
        try { replyTarget = await interaction.channel.messages.fetch(data.messageId); } catch { replyTarget = null; }
      }
    }

    const cohostTemplate = settings?.cohostEmbed || {};
    const cohostEmbed = new EmbedBuilder()
      .setTitle(cohostTemplate.title || 'Data not found')
      .setDescription(cohostTemplate.description?.replace(/\$user/g, `<@${userId}>`) || 'Data was not found, please use `/settings` to configure the Embed')
      .setColor(embedColor)
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });
    if (cohostTemplate.image?.startsWith('http')) cohostEmbed.setImage(cohostTemplate.image);
    if (cohostTemplate.thumbnail?.startsWith('http')) cohostEmbed.setThumbnail(cohostTemplate.thumbnail);

    if (replyTarget && replyTarget.reply) await replyTarget.reply({ embeds: [cohostEmbed] });
    else await interaction.channel.send({ embeds: [cohostEmbed] });

    await interaction.editReply({ content: 'Cohost registered successfully.', ephemeral: true });
  }
};