const path = require('path');
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Settings = require('../../models/settings');

const REINVITES_IMAGE_PATH = path.join(__dirname, '..', '..', 'assets', 'reinvites-image.png');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reinvites')
    .setDescription('Post session reinvites')
    .addStringOption((option) =>
      option.setName('frp')
        .setDescription('FRP for the session')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('leo')
        .setDescription('LEO status for the session')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('spawn_location')
        .setDescription('Spawn location for the session')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('peacetime')
        .setDescription('Peacetime status')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('house_claiming')
        .setDescription('House claiming status')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('link')
        .setDescription('Session link')
        .setRequired(true)
    ),

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
    const frp = interaction.options.getString('frp');
    const leo = interaction.options.getString('leo');
    const spawnLocation = interaction.options.getString('spawn_location');
    const peacetime = interaction.options.getString('peacetime');
    const houseClaiming = interaction.options.getString('house_claiming');
    const link = interaction.options.getString('link');
    const reinvitesTemplate = settings?.reinvitesEmbed || {};
    const defaultTitle = '## :blue_butterflies: Greenville Life Roleplay - __Session Re-invites__ :blue_butterflies:';
    const defaultDescription = [
      '@everyone [User] is now doing session re-invites! This is your chance to join this session, if you couldn’t during release! Upon joining please listen to the host’s instructions and not doing so, will result in a moderation and a kick.',
      '',
      '<:blue_arrow:1489774422767439924> **FRP:** [FRP]',
      '<:blue_arrow:1489774422767439924> **LEO:** [LEO]',
      '<:blue_arrow:1489774422767439924> **Spawn location:** [Spawn location]',
      '<:blue_arrow:1489774422767439924> **Peacetime:** [Peacetime]',
      '<:blue_arrow:1489774422767439924> **House Claiming:** [House Claiming]',
      '<:blue_arrow:1489774422767439924> **Link:** [Link]'
    ].join('\n');
    const templateTitle = reinvitesTemplate.title || defaultTitle;
    const templateDescription = reinvitesTemplate.description || defaultDescription;

    const renderTemplate = (value) => (value || '')
      .replace(/\[User\]|\$user/g, userMention)
      .replace(/\[FRP\]|\$frp/g, frp)
      .replace(/\[LEO\]|\$leo/g, leo)
      .replace(/\[Spawn location\]|\$spawn_location/g, spawnLocation)
      .replace(/\[Peacetime\]|\$peacetime/g, peacetime)
      .replace(/\[House Claiming\]|\$house_claiming/g, houseClaiming)
      .replace(/\[Link\]|\$link/g, link);

    const renderedTitle = renderTemplate(templateTitle);
    const renderedDescription = renderTemplate(templateDescription);
    const shouldPingEveryone = !/@everyone/.test(`${renderedTitle}\n${renderedDescription}`);

    const reinvitesImage = new AttachmentBuilder(REINVITES_IMAGE_PATH, { name: 'reinvites-image.png' });
    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(renderedTitle)
      .setDescription(renderedDescription)
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

    if (reinvitesTemplate.image?.startsWith('http')) {
      embed.setImage(reinvitesTemplate.image);
    } else {
      embed.setImage('attachment://reinvites-image.png');
    }

    await interaction.channel.send({
      content: shouldPingEveryone ? '@everyone' : undefined,
      embeds: [embed],
      files: reinvitesTemplate.image?.startsWith('http') ? [] : [reinvitesImage]
    });

    await interaction.editReply({ content: 'Reinvites embed sent successfully.' });
  }
};
