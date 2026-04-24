const { 
  Events,
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder, 
  EmbedBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionsBitField 
} = require('discord.js');
const discordTranscripts = require('@fluxbot/discord-html-transcripts');
const Ticket = require('../models/support');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {

    if (interaction.isStringSelectMenu() && interaction.customId === 'supportOptions') {
      const type = interaction.values[0];
      const modal = new ModalBuilder()
        .setCustomId(`ticketModal_${type}`)
        .setTitle('Ticket Information');

      if (type === 'st') modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('helpNeeded')
          .setLabel('What help is needed?')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      ));

      if (type === 'mr') modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('userReport')
            .setLabel('Username/ID of reported member')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('What did they do?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('proof')
            .setLabel('Proof (link/image)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        )
      );

      if (type === 'ma') modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('The bots message')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      ));

      await interaction.showModal(modal);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticketModal_')) {
      const type = interaction.customId.split('_')[1];
      const ownerId = interaction.user.id;
      const guild = interaction.guild;
      const ticketName = `${type}_${ownerId}_ticket`;
      const roleId = type === 'st' ? '1417661969863020583' : '1417663103369478325';
      const everyone = guild.roles.everyone;

      const ticketChannel = await guild.channels.create({
        name: ticketName,
        type: 0,
        permissionOverwrites: [
          { id: everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: ownerId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: roleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      let description = '';
      if (type === 'st') description = `**Thank you for opening a ticket within *Greenville Roleplay Life*. Please wait for the staff team to come and reply.**\n\n<@${ownerId}>\n${interaction.fields.getTextInputValue('helpNeeded')}`;
      if (type === 'mr') description = `
    **Thank you for opening up a Member Report within *Greenville Roleplay Life*. 

__Member Report Format__**
**Username/ Username ID:** ${interaction.fields.getTextInputValue('userReport')}
**What did they do:** ${interaction.fields.getTextInputValue('reason')}
**Proof:** ${interaction.fields.getTextInputValue('proof') || 'No proof provided'}  
`;
      if (type === 'ma') description = `
    **Thank you for opening up a Moderation Appeal within *Greenville Roleplay Life*.


__Moderation Appeal Format:__**
**Your Username/Username ID:** ${interaction.user.tag}
**The bots message:** ${interaction.fields.getTextInputValue('reason')}`;

      const embed = new EmbedBuilder().setColor('#ff7f25').setDescription(description);
      const claimBtn = new ButtonBuilder().setCustomId('claimTicket').setLabel('Claim').setStyle(ButtonStyle.Success);
      const closeBtn = new ButtonBuilder().setCustomId('closeTicket').setLabel('Close').setStyle(ButtonStyle.Danger);
      const row = new ActionRowBuilder().addComponents(claimBtn, closeBtn);

      const msg = await ticketChannel.send({ content: `<@${ownerId}> <@&${roleId}>`, embeds: [embed], components: [row] });
      await msg.pin();

      await Ticket.create({
        guildId: guild.id,
        channelId: ticketChannel.id,
        ownerId,
        roleId,
        type
      });

      const logChannel = guild.channels.cache.get('1417296613839339621');
      if (logChannel) logChannel.send({ embeds: [new EmbedBuilder().setColor('#ff7f25').setDescription(`<@${ownerId}> opened a ${type === 'st' ? 'General Question' : type === 'mr' ? 'Member Report' : 'Moderation Appeal'} ticket in <#${ticketChannel.id}>.`)] });

      await interaction.reply({ content: 'Ticket opened!', ephemeral: true });
      return;
    }

    if (interaction.isButton()) {
      const ticketData = await Ticket.findOne({ channelId: interaction.channel.id });
      if (!ticketData) return;
      const logChannel = interaction.guild.channels.cache.get('1417296613839339621');

      if (interaction.customId === 'claimTicket') {
        if (ticketData.claimed) return interaction.reply({ content: 'Ticket already claimed!', ephemeral: true });
        if (!interaction.member.roles.cache.has(ticketData.roleId)) return interaction.reply({ content: 'You cannot claim this ticket.', ephemeral: true });

        ticketData.claimed = interaction.user.id;
        await ticketData.save();

        await interaction.channel.permissionOverwrites.edit(ticketData.roleId, { ViewChannel: false });
        await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder().setCustomId('unclaimTicket').setLabel('Unclaim').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('closeTicket').setLabel('Close').setStyle(ButtonStyle.Danger)
          );

        const msg = await interaction.channel.messages.fetch({ limit: 10 }).then(ms => ms.find(m => m.embeds.length));
        if (msg) msg.edit({ components: [row] });

        await interaction.reply({ content: `<@${interaction.user.id}> claimed the ticket.`, ephemeral: false });
        if (logChannel) logChannel.send({ embeds: [new EmbedBuilder().setColor('#ff7f25').setDescription(`<@${interaction.user.id}> claimed ticket <#${interaction.channel.id}>.`)] });
        return;
      }

      if (interaction.customId === 'unclaimTicket') {
        if (ticketData.claimed !== interaction.user.id) return interaction.reply({ content: 'You did not claim this ticket.', ephemeral: true });

        ticketData.claimed = null;
        await ticketData.save();

        await interaction.channel.permissionOverwrites.edit(ticketData.roleId, { ViewChannel: true });
        await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder().setCustomId('claimTicket').setLabel('Claim').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('closeTicket').setLabel('Close').setStyle(ButtonStyle.Danger)
          );

        const msg = await interaction.channel.messages.fetch({ limit: 10 }).then(ms => ms.find(m => m.embeds.length));
        if (msg) msg.edit({ components: [row] });

        await interaction.reply({ content: `<@${interaction.user.id}> unclaimed the ticket.`, ephemeral: false });
        if (logChannel) logChannel.send({ embeds: [new EmbedBuilder().setColor('#ff7f25').setDescription(`<@${interaction.user.id}> unclaimed ticket <#${interaction.channel.id}>.`)] });
        return;
      }

      if (interaction.customId === 'closeTicket') {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('confirmClose').setLabel('Confirm Close').setStyle(ButtonStyle.Danger));
        await interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff7f25').setDescription('Are you sure you want to close this ticket?')], components: [row], ephemeral: true });
        return;
      }

      if (interaction.customId === 'confirmClose') {
        const transcript = await discordTranscripts.createTranscript(interaction.channel);
        const closedAt = new Date();

        const finalEmbed = new EmbedBuilder()
          .setColor('#ff7f25')
          .setTitle('Ticket Closed')
          .setDescription('We hope we were able to help you.')
          .addFields(
            { name: 'Owner', value: `<@${ticketData.ownerId}>`, inline: true },
            { name: 'Closed by', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Opened at', value: `<t:${Math.floor(ticketData.createdAt.getTime()/1000)}:F>`, inline: true },
            { name: 'Closed at', value: `<t:${Math.floor(closedAt.getTime()/1000)}:F>`, inline: true }
          );

        const ownerMember = await interaction.guild.members.fetch(ticketData.ownerId).catch(() => null);
        if (ownerMember) ownerMember.send({ embeds: [finalEmbed], files: [transcript] }).catch(() => null);

        if (logChannel) logChannel.send({ embeds: [finalEmbed], files: [transcript] });

        await Ticket.deleteOne({ channelId: interaction.channel.id });
        await interaction.update({ content: 'Closing ticket in 5 seconds...', embeds: [], components: [] });
        setTimeout(() => interaction.channel.delete(), 5000);
      }
    }
  }
};
