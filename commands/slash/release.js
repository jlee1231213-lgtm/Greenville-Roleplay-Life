const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Settings = require('../../models/settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("release")
    .setDescription("Release a session")
    .addStringOption(option =>
      option.setName("link")
        .setDescription("Private server link")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("pt")
        .setDescription("PT status")
        .setRequired(true)
        .addChoices(
          { name: 'Strict', value: 'Strict' },
          { name: 'On', value: 'On' },
          { name: 'Off', value: 'Off' }
        ))
    .addStringOption(option =>
      option.setName("frplimit")
        .setDescription("FRP speed limit")
        .setRequired(true)
        .addChoices(
          { name: '65MPH', value: '65MPH' },
          { name: '75MPH', value: '75MPH' },
          { name: '85MPH', value: '85MPH' }
        ))
    .addStringOption(option =>
      option.setName("spawn_location")
        .setDescription("Spawn location")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("leo")
        .setDescription("LEO status")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("house_claiming")
        .setDescription("House claiming status")
        .setRequired(true)),

  async execute(interaction) {
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const embedColor = settings?.embedcolor || '#ab6cc4';
    const staffRoleId = settings?.staffRoleId;

    if (!staffRoleId || !interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Data not found')
            .setDescription(`You do not have the required role to use this command or data is not configured. Please use \`/settings\` to configure the Embed.`)
            .setColor(embedColor)
        ],
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const sessionLink = interaction.options.getString('link');
    const ptStatus = interaction.options.getString('pt');
    const frpLimit = interaction.options.getString('frplimit');
    const spawnLocation = interaction.options.getString('spawn_location');
    const leoStatus = interaction.options.getString('leo');
    const houseClaiming = interaction.options.getString('house_claiming');

    const releaseTemplate = settings?.releaseEmbed || {};
    const defaultTitle = '## :blue_butterflies: Greenville Life Roleplay - __Session Release__ :blue_butterflies:';
    const defaultDescription = [
      '@everyone [user] has now released their session link to all members that are participating in this session! Upon joining please listen to all the host\'s instructions.',
      '',
      '**Session Information**',
      '<:blue_arrow:1489774422767439924>  **FRP:** [frp]',
      '<:blue_arrow:1489774422767439924> **Spawn location:** [spawn_location]',
      '<:blue_arrow:1489774422767439924> **Leo:** [leo]',
      '<:blue_arrow:1489774422767439924> **Peacetime:** [peacetime]',
      '<:blue_arrow:1489774422767439924> **House Claiming:** [house_claiming]',
      '<:blue_arrow:1489774422767439924> **Link:** [link]'
    ].join('\n');
    const defaultImage = 'https://media.discordapp.net/attachments/1471648998266769468/1490184556362469476/image-22.png?ex=69ea3444&is=69e8e2c4&hm=53d59d5ba235b496fe10e06bb72c7bf839e7e3a5c6fabb1509878eb88c6eeccd&=&format=webp&quality=lossless&width=1486&height=862';

    const renderTemplate = (value) => (value || '')
      .replace(/\[user\]|\[User\]|\$user/g, `<@${interaction.user.id}>`)
      .replace(/\[frp\]|\[FRP\]|\$frplimit/g, frpLimit)
      .replace(/\[spawn_location\]|\[Spawn location\]|\$spawn_location/g, spawnLocation)
      .replace(/\[leo\]|\[LEO\]|\$leo/g, leoStatus)
      .replace(/\[peacetime\]|\[Peacetime\]|\$pt|\$peacetime/g, ptStatus)
      .replace(/\[house_claiming\]|\[House Claiming\]|\$house_claiming/g, houseClaiming)
      .replace(/\[link\]|\[Link\]|\$link/g, sessionLink);

    const renderedTitle = renderTemplate(releaseTemplate.title || defaultTitle);
    const renderedDescription = renderTemplate(releaseTemplate.description || defaultDescription);
    const shouldPingEveryone = !/@everyone/.test(`${renderedTitle}\n${renderedDescription}`);

    const embed = new EmbedBuilder()
      .setTitle(renderedTitle)
      .setDescription(renderedDescription)
      .setColor(embedColor)
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

    embed.setImage(releaseTemplate.image?.startsWith('http') ? releaseTemplate.image : defaultImage);
    if (releaseTemplate.thumbnail?.startsWith('http')) embed.setThumbnail(releaseTemplate.thumbnail);

    await interaction.channel.send({
      content: shouldPingEveryone ? '@everyone' : undefined,
      embeds: [embed]
    });

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setDescription(`Session has been released successfully.`)
          .setColor(embedColor)
      ]
    });
  }
};
