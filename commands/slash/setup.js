const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Settings = require('../../models/settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Post the session setup embed'),

  async execute(interaction) {
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const embedColor = settings?.embedcolor || '#ab6cc4';
    const allowedRoleIds = [settings?.staffRoleId, settings?.adminRoleId].filter(Boolean);

    if (!allowedRoleIds.length || !interaction.member.roles.cache.some((role) => allowedRoleIds.includes(role.id))) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription('You do not have the required role to use this command.')
            .setColor(embedColor)
        ],
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const userMention = `<@${interaction.user.id}>`;
    const setupTemplate = settings?.setupEmbed || {};
    const defaultTitle = '## :load: Greenville Roleplay Life - __Session Setup__ :load:';
    const defaultDescription = [
      '<:gvrl_dot:1487527971777417327> [user] is now setting up their Greenville Session. Give the host about 5-10 for  EA, Staff, Law Enforcement; to join early, then 5 minutes after Link will be given to Civilian(s)'
    ].join('\n');
    const defaultImage = 'https://media.discordapp.net/attachments/1471648998266769468/1490181964282462299/image-14.png?ex=69ea31da&is=69e8e05a&hm=c0aa837607464286d56548390e63e78a48d4d6d40e712518d214fc7e713e7aef&=&format=webp&quality=lossless&width=1498&height=866';

    const renderTemplate = (value) => (value || '')
      .replace(/\[user\]|\[User\]|\$user/g, userMention);

    const renderedTitle = renderTemplate(setupTemplate.title || defaultTitle);
    const renderedDescription = renderTemplate(setupTemplate.description || defaultDescription);
    const setupImageUrl = setupTemplate.image || defaultImage;

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(renderedTitle)
      .setDescription(renderedDescription)
      .setImage(setupImageUrl)
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

    await interaction.channel.send({ embeds: [embed] });
    await interaction.editReply({ content: 'Setup embed sent successfully.' });
  }
};
