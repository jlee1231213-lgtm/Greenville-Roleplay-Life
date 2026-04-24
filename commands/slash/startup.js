const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const StartupSession = require('../../models/startupsession');
const Settings = require('../../models/settings');
const { getStartupEmbedTemplate } = require('../../utils/startupEmbedDefaults');

const activeStartupSessions = new Map();

async function syncStartupEmbedSetting(settings, startupTemplate) {
  const current = settings.startupEmbed || {};
  const isSynced =
    current.title === startupTemplate.title &&
    current.description === startupTemplate.description &&
    current.image === startupTemplate.image;

  if (isSynced) return;

  settings.startupEmbed = {
    title: startupTemplate.title,
    description: startupTemplate.description,
    image: startupTemplate.image
  };
  settings.markModified('startupEmbed');
  await settings.save();
}

function applyStartupPlaceholders(value, userId, reactionsRequired, now) {
  return value
    .replace(/\$user|\[user\]|\[User\]/g, `<@${userId}>`)
    .replace(/\$date|\[date\]|\[Date\]/g, now.toLocaleString())
    .replace(/\$reactions|\[reactions\]|\[Reactions\]/g, reactionsRequired);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('startup')
    .setDescription('Start a session')
    .addIntegerOption(option =>
      option.setName('reactions')
        .setDescription('Amount of reactions needed to start')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    if (!settings) return interaction.editReply({ content: 'Settings not found', ephemeral: true });

    const staffRoleId = settings.staffRoleId;
    if (!staffRoleId || !interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.editReply({ content: 'You must have the Staff role', ephemeral: true });
    }

    const reactionsRequired = interaction.options.getInteger('reactions') || 5;
    const userId = interaction.user.id;
    const now = new Date();
    const embedColor = settings.embedcolor || '#ab6cc4';
    const startupTemplate = getStartupEmbedTemplate(settings);
    const setupTemplate = settings.setupEmbed || {};

    await syncStartupEmbedSetting(settings, startupTemplate);

    const embed = new EmbedBuilder()
      .setTitle(applyStartupPlaceholders(startupTemplate.title, userId, reactionsRequired, now))
      .setDescription(applyStartupPlaceholders(startupTemplate.description, userId, reactionsRequired, now))
      .setColor(embedColor)
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

    const startupImage = startupTemplate.image;
    if (startupImage && startupImage.startsWith('http')) embed.setImage(startupImage);

    const message = await interaction.channel.send({ embeds: [embed] });
    await message.react('✅');

    const sessionId = uuidv4();
    activeStartupSessions.set(sessionId, { userId, timestamp: now, type: 'session', messageId: message.id });

    await StartupSession.create({ guildId: interaction.guild.id, channelId: interaction.channel.id, messageId: message.id, createdAt: now });

    await interaction.editReply({ content: 'Session started successfully.', ephemeral: true });

    const filter = (reaction, user) => reaction.emoji.name === '✅' && !user.bot;
    const collector = message.createReactionCollector({ filter, max: reactionsRequired, time: 1000 * 60 * 60 }); 

    collector.on('collect', async () => {
      if (message.reactions.cache.get('✅')?.count - 1 >= reactionsRequired) {
        collector.stop();

        const setupEmbed = new EmbedBuilder()
          .setTitle(setupTemplate.title?.replace(/\$user/g, `<@${userId}>`) || 'Data not found')
          .setDescription(setupTemplate.description?.replace(/\$user/g, `<@${userId}>`) || 'Data was not found, please use `/settings` to configure the Embed')
          .setColor(embedColor);

        if (setupTemplate.image && setupTemplate.image.startsWith('http')) setupEmbed.setImage(setupTemplate.image);

        await message.reply({ embeds: [setupEmbed] });
      }
    });

    collector.on('end', collected => {
      console.log(`Reaction collector ended. Total collected: ${collected.size}`);
    });
  }
};

module.exports.activeStartupSessions = activeStartupSessions;
