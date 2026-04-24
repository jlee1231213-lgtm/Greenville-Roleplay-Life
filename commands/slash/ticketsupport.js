const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketsupport')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .setDescription('Open a ticket support dropdown.'),
  async execute(interaction) {
    const channelid = `${interaction.channel.id}`
    const banner = "https://cdn.discordapp.com/attachments/1311920455594278962/1311944538566430760/rrvbanner_2.png?ex=674ab310&is=67496190&hm=ce3dd9e7494ec45853c46905f087a6a9ddccc65371f1a98fe7eb8200500dfe20&"

 
    await interaction.deferReply(); 


    const embed = new EmbedBuilder()
      .setTitle('Communited Assistance')
      .setDescription(`**<:orange_arrow:1418054390765457479>: General Question**
<:sub1v2:1418076490972532868> Opening a “General Question” ticket means you may ask any concerns or suggestions about or in **Greenville Roleplay Life**


**<:orange_arrow:1418054390765457479> Member Report**
<:sub1v2:1418076490972532868> If you want to report a member/staff that **broke the communities rules or Discord TOS**, open a “Member Report” for one of our staff members to come and help out


**<:orange_arrow:1418054390765457479> Moderation Appeal**
<:sub1v2:1418076490972532868> If you were given a infraction or strike and you think its appealable/unreasonable, then open up a “Moderation Appeal” for one of our staff members to come and help with your appeal.`)
      .setColor(`#ff7f25`)
      .setImage("https://cdn.discordapp.com/attachments/1417296613839339621/1420607848261619782/Your_paragraph_text.png?ex=68d603a8&is=68d4b228&hm=36bee8efa2eb423650e96c683562ed65a077d0574d04345732b849fbf21a0a8f&")
      .setFooter({ text: `${interaction.guild.name}`,
       iconURL:  `${interaction.guild.iconURL()}` });


    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('supportOptions')
          .setPlaceholder('Select an option')
          .addOptions([
            {
              label: 'General Question',
              description: `Open a ticket to ask a question.`,
              value: 'st',
            },
            {
              label: 'Member Report',
              description: 'Open a ticket to report a member.',
              value: 'mr',
            },
            {
              label: 'Moderation Appeal',
              description: 'Open a ticket to appeal a moderation action.',
              value: 'ma',
            },
          ])
      );

    const supportChannel = interaction.guild.channels.cache.get(`${channelid}`);
    if (supportChannel) {
      await supportChannel.send({ embeds: [embed], components: [row] });
      await interaction.followUp({ content: 'The support ticket options have been sent.', ephemeral: true });
    } else {
      await interaction.followUp({ content: 'Unable to find the support channel.', ephemeral: true });
    }
  },
};