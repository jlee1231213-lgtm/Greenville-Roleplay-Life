const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Settings = require('../../models/settings');
const { activeStartupSessions } = require('./startup');

const DEFAULT_SUPERVISE_EMBED = {
  title: '<:blue_profile:1490083249479749865> Greenville Roleplay Life -__ Session Supervise__ <:blue_profile:1490083249479749865>',
  description: ':Animated_Arrow_Bluelite: [User] is now Supervising this Greenville Session. This is to run the session smoothly and no FRPers.',
  image: 'https://media.discordapp.net/attachments/1471648998266769468/1490184267022733543/image-24.png?ex=69ecd6ff&is=69eb857f&hm=2e70ddddc6152b1700ff25990a50ffec9ac40afad8f304502e39cabba5a81dee&=&format=webp&quality=lossless&width=1494&height=856'
};

function renderTemplate(value, userId) {
  return (value || '').replace(/\$user|\[user\]|\[User\]/g, `<@${userId}>`);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('supervise')
    .setDescription('Supervise a session'),

  async execute(interaction) {
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const embedColor = settings?.embedcolor || '#ab6cc4';
    const allowedRoleId = settings?.staffRoleId;

    if (!allowedRoleId || !interaction.member.roles.cache.has(allowedRoleId)) {
      return interaction.reply({ content: 'No permission', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    const latestStartup = [...activeStartupSessions.entries()]
      .filter(([, data]) => data.type === 'session')
      .sort((a, b) => b[1].timestamp - a[1].timestamp)[0];

    let replyTarget = null;
    if (latestStartup) {
      const [, data] = latestStartup;
      if (data.messageId) {
        try {
          replyTarget = await interaction.channel.messages.fetch(data.messageId);
        } catch {
          replyTarget = null;
        }
      }
    }

    const superviseTemplate = settings?.superviseEmbed || {};
    const superviseTitle = superviseTemplate.title || DEFAULT_SUPERVISE_EMBED.title;
    const superviseDescription = superviseTemplate.description || DEFAULT_SUPERVISE_EMBED.description;
    const superviseImage = superviseTemplate.image || DEFAULT_SUPERVISE_EMBED.image;

    const superviseEmbed = new EmbedBuilder()
      .setTitle(renderTemplate(superviseTitle, userId))
      .setDescription(renderTemplate(superviseDescription, userId))
      .setColor(embedColor)
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

    if (superviseImage?.startsWith('http')) superviseEmbed.setImage(superviseImage);
    if (superviseTemplate.thumbnail?.startsWith('http')) superviseEmbed.setThumbnail(superviseTemplate.thumbnail);

    if (replyTarget && replyTarget.reply) await replyTarget.reply({ embeds: [superviseEmbed] });
    else await interaction.channel.send({ embeds: [superviseEmbed] });

    await interaction.editReply({ content: 'Session supervisor registered successfully.', ephemeral: true });
  }
};
