const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ComponentType, ButtonStyle } = require('discord.js');
const StartupSession = require('../../models/startupsession');
const Settings = require('../../models/settings');

const DEFAULT_EA_EMBED = {
  title: ':blue_butterflies: Greenville Life Roleplay - __Early Access!__ :blue_butterflies:',
  description: [
    '<:blue_arrow:1489774422767439924> @everyone [User] has now released Early Access to their session! Once in please listen to the host\'s instructions and park up upon arrival. Please park up ans wait for the host to release!',
    '',
    '> <:blue_arrow:1489774422767439924> Not listening to the host will result in a moderation to our staff team.',
    '',
    '**Link:**'
  ].join('\n'),
  image: 'https://media.discordapp.net/attachments/1471648998266769468/1490183831863689226/image-11.png?ex=69ecd697&is=69eb8517&hm=eb8d6c07cdc39f4dbf533ee1f056126a962ccb7e917516eb120fcf47a102a33f&=&format=webp&quality=lossless&width=1484&height=864'
};

function renderTemplate(value, userMention) {
  return (value || '').replace(/\$user|\[user\]|\[User\]/g, userMention);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ea")
    .setDescription("Post early access for a session")
    .addStringOption(option =>
      option.setName("link")
        .setDescription("The link to the private server")
        .setRequired(true)
    ),

  async execute(interaction) {
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const embedColor = settings?.embedcolor || '#ab6cc4';

    if (!settings) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Data not found')
            .setDescription('Data was not found, please use `/settings` to configure the Embed.')
            .setColor(embedColor)
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        ],
        ephemeral: true
      });
    }

    const allowedRoleIds = [settings.eaRoleId, settings.staffRoleId, settings.adminRoleId, settings.leoRoleId].filter(Boolean);
    if (!interaction.member.roles.cache.some(r => allowedRoleIds.includes(r.id))) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription('You do not have the required role to access the link.')
            .setColor(embedColor)
        ],
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const sessionLink = interaction.options.getString('link');
    const userMention = `<@${interaction.user.id}>`;
    const eaTemplate = settings.eaEmbed || {};
    const eaTitle = eaTemplate.title || DEFAULT_EA_EMBED.title;
    const eaDescription = eaTemplate.description || DEFAULT_EA_EMBED.description;
    const eaImage = eaTemplate.image || DEFAULT_EA_EMBED.image;

    const embed = new EmbedBuilder()
      .setTitle(renderTemplate(eaTitle, userMention))
      .setDescription(renderTemplate(eaDescription, userMention))
      .setColor(embedColor)
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

    if (eaImage?.startsWith('http')) embed.setImage(eaImage);
    if (eaTemplate.thumbnail?.startsWith('http')) embed.setThumbnail(eaTemplate.thumbnail);

    const button = new ButtonBuilder().setCustomId('get_ealink').setLabel('Get Link').setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(button);

    const earlyAccessMessage = await interaction.channel.send({ content: '@here', embeds: [embed], components: [row] });
    await interaction.editReply({ content: 'Early access message sent successfully.' });

    let logChannel;
    try { logChannel = await interaction.client.channels.fetch(settings.logChannelId); } catch { logChannel = null; }

    if (logChannel) {
      logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Early Access Command Executed')
            .setDescription(`Early access was initiated by ${interaction.user.tag}`)
            .addFields(
              { name: 'Channel', value: `${interaction.channel.name} (${interaction.channel.id})`, inline: true },
              { name: 'Message Link', value: `[Jump to Message](${earlyAccessMessage.url})`, inline: true },
              { name: 'Link Provided', value: sessionLink }
            )
            .setColor(embedColor)
            .setTimestamp()
        ]
      });
    }

    const collector = earlyAccessMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3600000 });
    collector.on('collect', async i => {
      if (!i.member.roles.cache.some(r => allowedRoleIds.includes(r.id))) {
        return i.reply({
          embeds: [new EmbedBuilder().setDescription('You do not have the required role.').setColor(embedColor)],
          ephemeral: true
        });
      }

      const startup = await StartupSession.findOne({ guildId: i.guild.id }).sort({ createdAt: -1 });
      if (!startup) {
        return i.reply({
          embeds: [new EmbedBuilder().setDescription('Startup message not found. Please ask a host to initiate one.').setColor(embedColor)],
          ephemeral: true
        });
      }

      const startupChannel = await interaction.client.channels.fetch(startup.channelId);
      const startupMsg = await startupChannel.messages.fetch(startup.messageId).catch(() => null);
      if (!startupMsg) {
        return i.reply({
          embeds: [new EmbedBuilder().setDescription('Startup message no longer exists.').setColor(embedColor)],
          ephemeral: true
        });
      }

      const reaction = startupMsg.reactions.cache.get('✅');
      if (!reaction || !(await reaction.users.fetch()).has(i.user.id)) {
        return i.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Reaction Required')
              .setDescription(`You must react to the [startup message](https://discord.com/channels/${i.guild.id}/${startup.channelId}/${startup.messageId}) to get access.`)
              .setColor(embedColor)
          ],
          ephemeral: true
        });
      }

      await i.reply({
        embeds: [new EmbedBuilder().setDescription(`[Click here to join the session](${sessionLink})`).setColor(embedColor)],
        ephemeral: true
      });

      if (logChannel) {
        logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('Early Access Link Used')
              .setDescription(`<@${i.user.id}> used the EA button in <#${interaction.channel.id}>`)
              .setColor(embedColor)
              .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
          ]
        });
      }
    });
  }
};
