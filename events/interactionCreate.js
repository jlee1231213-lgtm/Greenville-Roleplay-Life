module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                try {
                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply({ content: 'There was an error while executing this command!', embeds: [], components: [] });
                    } else {
                        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                    }
                } catch (replyError) {
                    console.error('Failed to send interaction error response:', replyError);
                }
            }
        }
    },
};
