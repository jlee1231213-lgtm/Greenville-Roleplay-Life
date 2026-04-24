const { 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    EmbedBuilder 
} = require('discord.js');
const Settings = require('../models/settings');
const { STARTUP_EMBED_DEFAULTS, getStartupEmbedTemplate } = require('../utils/startupEmbedDefaults');

async function updateSetting(guildId, field, value) {
    let doc = await Settings.findOne({ guildId });
    if (!doc) doc = new Settings({ guildId });
    if (typeof value === 'object' && !Array.isArray(value)) {
        doc.set(field, value);
        doc.markModified(field);
    } else doc[field] = value;
    await doc.save();
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.guild) return;
        const guildId = interaction.guild.id;
        const settings = await Settings.findOne({ guildId });
        const color = settings?.embedcolor || '#0099ff';

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'settings_menu') {
                switch (interaction.values[0]) {
                    case 'roles': {
                        const embed = new EmbedBuilder()
                            .setTitle('Roles Configuration')
                            .setDescription('Select a role category to configure (up to 4 roles, first required)')
                            .setColor(color);
                        const row = new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('roles_menu')
                                .setPlaceholder('Select role category')
                                .addOptions([
                                    { label: 'Law Enforcement Officers', value: 'leoRoleId' },
                                    { label: 'Civilian', value: 'civiRoleId' },
                                    { label: 'Early Access', value: 'eaRoleId' },
                                    { label: 'Staff', value: 'staffRoleId' },
                                    { label: 'Administrators', value: 'adminRoleId' },
                                ])
                        );
                        return interaction.update({ embeds: [embed], components: [row], ephemeral: true });
                    }

                    case 'welcomechannelid': {
                        const modal = new ModalBuilder()
                            .setCustomId('welcome_channel_modal')
                            .setTitle('Set Welcome Channel ID')
                            .addComponents(
                                new ActionRowBuilder().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId('welcome_channel_input')
                                        .setLabel('Welcome Channel ID')
                                        .setStyle(TextInputStyle.Short)
                                        .setRequired(true)
                                )
                            );
                        return interaction.showModal(modal);
                    }

                    case 'loggingchannelid': {
                        const modal = new ModalBuilder()
                            .setCustomId('logging_channel_modal')
                            .setTitle('Set Logging Channel ID')
                            .addComponents(
                                new ActionRowBuilder().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId('logging_channel_input')
                                        .setLabel('Logging Channel ID')
                                        .setStyle(TextInputStyle.Short)
                                        .setRequired(true)
                                )
                            );
                        return interaction.showModal(modal);
                    }

                    case 'embeds': {
                        const embed = new EmbedBuilder()
                            .setTitle('Embeds Configuration')
                            .setDescription('Select an embed category to configure')
                            .setColor(color);
                        const row = new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('embeds_menu')
                                .setPlaceholder('Select embed category')
                                .addOptions([
                                    { label: 'Startup Embed', value: 'startupEmbed' },
                                    { label: 'EA Embed', value: 'eaEmbed' },
                                    { label: 'Giveaway Embed', value: 'giveawayEmbed' },
                                    { label: 'Setup Embed', value: 'setupEmbed' },
                                    { label: 'Welcome Embed', value: 'welcomeEmbed' },
                                    { label: 'Cohost Embed', value: 'cohostEmbed' },
                                    { label: 'Release Embed', value: 'releaseEmbed' },
                                    { label: 'Reinvites Embed', value: 'reinvitesEmbed' },
                                    { label: 'Over Embed', value: 'overEmbed' },
                                ])
                        );
                        return interaction.update({ embeds: [embed], components: [row], ephemeral: true });
                    }

                    case 'embed_colors': {
                        const modal = new ModalBuilder()
                            .setCustomId('embed_color_modal')
                            .setTitle('Set Embed Color')
                            .addComponents(
                                new ActionRowBuilder().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId('embed_color_input')
                                        .setLabel('Hex Color (e.g., #FF0000)')
                                        .setStyle(TextInputStyle.Short)
                                        .setRequired(true)
                                )
                            );
                        return interaction.showModal(modal);
                    }

                    case 'vehicle_list':
                    case 'trailer_list': {
                        const type = interaction.values[0] === 'vehicle_list' ? 'vehiclelist' : 'trailerlist';
                        const currentList = settings?.[type] || 'No items yet';
                        const embed = new EmbedBuilder()
                            .setTitle(`${type.replace('list','').toUpperCase()} List`)
                            .setDescription(`Current items:\n${currentList}\nSelect an action below:`)
                            .setColor(color);
                        const row = new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId(`${type}_menu`)
                                .setPlaceholder('Choose action')
                                .addOptions([
                                    { label: 'Add', value: 'add' },
                                    { label: 'Remove', value: 'remove' },
                                ])
                        );
                        return interaction.update({ embeds: [embed], components: [row], ephemeral: true });
                    }
                }
            }

            const roleFields = ['leoRoleId','civiRoleId','eaRoleId','staffRoleId','adminRoleId'];
            if (roleFields.includes(interaction.values[0])) {
                const field = interaction.values[0];
                const modal = new ModalBuilder().setCustomId(`role_modal_${field}`).setTitle('Set Roles');
                for (let i = 1; i <= 4; i++) {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId(`role_input_${i}`)
                                .setLabel(`Role ID ${i}${i===1?' (Required)':''}`)
                                .setStyle(TextInputStyle.Short)
                                .setRequired(i===1)
                        )
                    );
                }
                return interaction.showModal(modal);
            }

            const embedFields = ['startupEmbed','eaEmbed','giveawayEmbed','setupEmbed','welcomeEmbed','cohostEmbed','cohostendEmbed','releaseEmbed','reinvitesEmbed','overEmbed'];
            if (embedFields.includes(interaction.values[0])) {
                const field = interaction.values[0];
                const currentEmbed = field === 'startupEmbed'
                    ? getStartupEmbedTemplate(settings)
                    : settings?.[field] || {};
                const defaultSetupTitle = '## :load: Greenville Roleplay Life - __Session Setup__ :load:';
                const defaultSetupDescription = '<:gvrl_dot:1487527971777417327> [user] is now setting up their Greenville Session. Give the host about 5-10 for  EA, Staff, Law Enforcement; to join early, then 5 minutes after Link will be given to Civilian(s)';
                const defaultSetupImage = 'https://media.discordapp.net/attachments/1471648998266769468/1490181964282462299/image-14.png?ex=69ea31da&is=69e8e05a&hm=c0aa837607464286d56548390e63e78a48d4d6d40e712518d214fc7e713e7aef&=&format=webp&quality=lossless&width=1498&height=866';
                const defaultReleaseTitle = '## :blue_butterflies: Greenville Life Roleplay - __Session Release__ :blue_butterflies:';
                const defaultReleaseDescription = [
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
                const defaultReleaseImage = 'https://media.discordapp.net/attachments/1471648998266769468/1490184556362469476/image-22.png?ex=69ea3444&is=69e8e2c4&hm=53d59d5ba235b496fe10e06bb72c7bf839e7e3a5c6fabb1509878eb88c6eeccd&=&format=webp&quality=lossless&width=1486&height=862';
                const defaultReinvitesTitle = '## :blue_butterflies: Greenville Life Roleplay - __Session Re-invites__ :blue_butterflies:';
                const defaultReinvitesDescription = [
                    '@everyone [User] is now doing session re-invites! This is your chance to join this session, if you couldn’t during release! Upon joining please listen to the host’s instructions and not doing so, will result in a moderation and a kick.',
                    '',
                    '<:blue_arrow:1489774422767439924> **FRP:** [FRP]',
                    '<:blue_arrow:1489774422767439924> **LEO:** [LEO]',
                    '<:blue_arrow:1489774422767439924> **Spawn location:** [Spawn location]',
                    '<:blue_arrow:1489774422767439924> **Peacetime:** [Peacetime]',
                    '<:blue_arrow:1489774422767439924> **House Claiming:** [House Claiming]',
                    '<:blue_arrow:1489774422767439924> **Link:** [Link]'
                ].join('\n');
                const defaultOverTitle = 'Greenville Life Roleplay - __Session Over__ :blue_butterflies:';
                const defaultOverDescription = [
                    '<:blue_bow:1487528994307051530> [User] Has now ended their session. We hope you enjoyed it and another one will be hosted shortly, thank you for joining!',
                    '',
                    '<:blue_arrow:1489774422767439924> **Reminder:** There is a 20 minute cool down until the next session.'
                ].join('\n');
                const defaultOverImage = 'https://media.discordapp.net/attachments/1471648998266769468/1490185130961014994/image-25.png?ex=69ecd7cd&is=69eb864d&hm=36a82cbdf01da9d2c4698ad54bc102a32d1154749ee394b807392a1d49056bcd&=&format=webp&quality=lossless&width=2118&height=1248';
                const defaultCohostTitle = '<:gvrl_car:1487528927089135626> Greenville Roleplay Life -__ Co-host__ <:gvrl_car:1487528927089135626>';
                const defaultCohostDescription = ':Animated_Arrow_Bluelite: [User] is now co-hosting this Greenville session. If the host is unavailable or isn\'t responding. Refer to the co-host.';
                const defaultCohostImage = 'https://media.discordapp.net/attachments/1471648998266769468/1490184187796521213/image-28.png?ex=69ecd6ec&is=69eb856c&hm=363175826a5aa36e2ed0335282ecb4972a4949094786946d4ae6e075aa783f5a&=&format=webp&quality=lossless&width=1488&height=848';
                const defaultTitle = field === 'reinvitesEmbed'
                    ? defaultReinvitesTitle
                    : field === 'releaseEmbed'
                        ? defaultReleaseTitle
                    : field === 'startupEmbed'
                        ? STARTUP_EMBED_DEFAULTS.title
                    : field === 'overEmbed'
                        ? defaultOverTitle
                    : field === 'cohostEmbed'
                        ? defaultCohostTitle
                    : field === 'setupEmbed'
                        ? defaultSetupTitle
                        : '';
                const defaultDescription = field === 'reinvitesEmbed'
                    ? defaultReinvitesDescription
                    : field === 'releaseEmbed'
                        ? defaultReleaseDescription
                    : field === 'startupEmbed'
                        ? STARTUP_EMBED_DEFAULTS.description
                    : field === 'overEmbed'
                        ? defaultOverDescription
                    : field === 'cohostEmbed'
                        ? defaultCohostDescription
                    : field === 'setupEmbed'
                        ? defaultSetupDescription
                        : '';
                const defaultImage = field === 'setupEmbed'
                    ? defaultSetupImage
                    : field === 'releaseEmbed'
                        ? defaultReleaseImage
                    : field === 'startupEmbed'
                        ? STARTUP_EMBED_DEFAULTS.image
                    : field === 'overEmbed'
                        ? defaultOverImage
                    : field === 'cohostEmbed'
                        ? defaultCohostImage
                        : '';
                const modal = new ModalBuilder().setCustomId(`embed_modal_${field}`).setTitle('Set Embed');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('title_input')
                            .setLabel('Title')
                            .setStyle(TextInputStyle.Short)
                            .setValue(currentEmbed.title || defaultTitle)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('desc_input')
                            .setLabel('Description')
                            .setStyle(TextInputStyle.Paragraph)
                            .setValue(currentEmbed.description || defaultDescription)
                            .setRequired(false)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('image_input')
                            .setLabel('Image URL')
                            .setStyle(TextInputStyle.Short)
                            .setValue(currentEmbed.image || defaultImage)
                            .setRequired(false)
                    )
                );
                return interaction.showModal(modal);
            }

            if (interaction.customId === 'vehiclelist_menu' || interaction.customId === 'trailerlist_menu') {
                const type = interaction.customId.includes('vehicle') ? 'vehiclelist' : 'trailerlist';
                const action = interaction.values[0];
                const modal = new ModalBuilder().setCustomId(`${type}_${action}`).setTitle(`${action.toUpperCase()} ${type}`);
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('list_input')
                            .setLabel('Enter each item on a new line')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )
                );
                return interaction.showModal(modal);
            }
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('role_modal_')) {
                const field = interaction.customId.replace('role_modal_','');
                const roles = [];
                for (let i = 1; i <= 4; i++) {
                    const value = interaction.fields.getTextInputValue(`role_input_${i}`)?.trim();
                    if (value) roles.push(value);
                }
                if (roles.length === 0) return interaction.reply({ content: 'At least one role is required!', ephemeral: true });
                await updateSetting(guildId, field, roles.join(','));
                return interaction.reply({ content: 'Roles updated successfully!', ephemeral: true });
            }

            if (interaction.customId === 'welcome_message_modal') {
                const message = interaction.fields.getTextInputValue('welcome_message_input');
                await updateSetting(guildId, 'welcomemessage', message);
                return interaction.reply({ content: 'Welcome message updated successfully!', ephemeral: true });
            }
            if (interaction.customId === 'logging_channel_modal') {
                const channel = interaction.fields.getTextInputValue('logging_channel_input');
                await updateSetting(guildId, 'logChannelId', channel);
                return interaction.reply({ content: `Logging channel set to <#${channel}>`, ephemeral: true });
            }

            if (interaction.customId.startsWith('embed_modal_')) {
                const field = interaction.customId.replace('embed_modal_','');
                const title = interaction.fields.getTextInputValue('title_input');
                const description = interaction.fields.getTextInputValue('desc_input') || null;
                const image = interaction.fields.getTextInputValue('image_input') || null;
                await updateSetting(guildId, field, { title, description, image });
                return interaction.reply({ content: 'Embed updated successfully!', ephemeral: true });
            }

            if (interaction.customId === 'embed_color_modal') {
                const colorInput = interaction.fields.getTextInputValue('embed_color_input');
                await updateSetting(guildId, 'embedcolor', colorInput);
                return interaction.reply({ content: `Embed color set to ${colorInput}`, ephemeral: true });
            }

            if (interaction.customId.endsWith('_add') || interaction.customId.endsWith('_remove')) {
                const type = interaction.customId.includes('vehicle') ? 'vehiclelist' : 'trailerlist';
                const items = interaction.fields.getTextInputValue('list_input').split('\n').map(i=>i.trim()).filter(i=>i);
                const current = (await Settings.findOne({ guildId }))?.[type]?.split('\n') || [];
                if (interaction.customId.endsWith('_add')) {
                    await updateSetting(guildId, type, [...current, ...items].join('\n'));
                    return interaction.reply({ content: 'Items added successfully!', ephemeral: true });
                } else {
                    await updateSetting(guildId, type, current.filter(i=>!items.includes(i)).join('\n'));
                    return interaction.reply({ content: 'Items removed successfully!', ephemeral: true });
                }
            }
        }
    }
};
