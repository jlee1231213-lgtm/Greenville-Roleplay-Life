const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Settings = require('../../models/settings');
const { activeStartupSessions } = require('./startup');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_COHOST_EMBED = {
  title: '<:gvrl_car:1487528927089135626> Greenville Roleplay Life -__ Co-host__ <:gvrl_car:1487528927089135626>',
  description: ':Animated_Arrow_Bluelite: [User] is now co-hosting this Greenville session. If the host is unavailable or isn\'t responding. Refer to the co-host.',
  image: 'https://media.discordapp.net/attachments/1471648998266769468/1490184187796521213/image-28.png?ex=69ecd6ec&is=69eb856c&hm=363175826a5aa36e2ed0335282ecb4972a4949094786946d4ae6e075aa783f5a&=&format=webp&quality=lossless&width=1488&height=848'
};

function renderTemplate(value, userId) {
  return (value || '').replace(/\$user|\[user\]|\[User\]/g, `<@${userId}>`);
}

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
    const cohostTitle = cohostTemplate.title || DEFAULT_COHOST_EMBED.title;
    const cohostDescription = cohostTemplate.description || DEFAULT_COHOST_EMBED.description;
    const cohostImage = cohostTemplate.image || DEFAULT_COHOST_EMBED.image;
    const cohostEmbed = new EmbedBuilder()
      .setTitle(renderTemplate(cohostTitle, userId))
      .setDescription(renderTemplate(cohostDescription, userId))
      .setColor(embedColor)
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });
    if (cohostImage?.startsWith('http')) cohostEmbed.setImage(cohostImage);
    if (cohostTemplate.thumbnail?.startsWith('http')) cohostEmbed.setThumbnail(cohostTemplate.thumbnail);

    if (replyTarget && replyTarget.reply) await replyTarget.reply({ embeds: [cohostEmbed] });
    else await interaction.channel.send({ embeds: [cohostEmbed] });

    await interaction.editReply({ content: 'Cohost registered successfully.', ephemeral: true });
  }
};
