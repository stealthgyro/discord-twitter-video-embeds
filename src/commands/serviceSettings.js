const {
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandIntegerOption,
    SlashCommandStringOption,
    InteractionResponse,
    CommandInteraction,
    SlashCommandSubcommandGroupBuilder,
    SlashCommandBooleanOption
  } = require("discord.js");
  const Command = require("../structures/Command");
  const GuildOptions = require("../structures/GuildOptions");
  const { DEFAULT_MEDIA_SERVICES } = require("../util/Constants");
  const log = require("../util/log");
  
  const command = new SlashCommandBuilder()
    .setName("servicesettings")
    .setDescription("Tilted, External, or Off")
    .addStringOption(option =>
        option.setName('mediaservice')
        .setDescription('Select the service you are modifying.')
        .setRequired(true)
        .addChoices(
            { name: 'Facebook', value: 'facebook' },
            { name: 'Instagram', value: 'instagram' },
            { name: 'Reddit', value: 'reddit' },
            { name: 'TikTok', value: 'tiktok' },
            { name: 'Twitter', value: 'twitter' },
    ))
    .addStringOption(option =>
        option.setName('tiltedexternaloff')
        .setDescription('tilted, off, or service url.')
        .setRequired(true)
    )
    
  
  module.exports = new Command(
    command,
    /**
     * @param {CommandInteraction} interaction
     */
    function settingsService(interaction) {
        // @ts-ignore
        let tiltedExternalOff = interaction.options.getString("tiltedexternaloff");
        // @ts-ignore
        let mediaService = interaction.options.getString("mediaservice");
        GuildOptions.getOptions(interaction.guild.id).then((options) => {
            log.info(options);
            let mediaServiceObj = JSON.parse(options.serviceSettings) || DEFAULT_MEDIA_SERVICES;
            log.info(mediaServiceObj);
            if( mediaServiceObj[mediaService] && mediaServiceObj[mediaService] == tiltedExternalOff){
                interaction.reply({
                    content: `Service: ${mediaService} is already set to ${tiltedExternalOff}.`,
                    ephemeral: true
                });
                return;
            } else {
                mediaServiceObj[mediaService] = tiltedExternalOff;
                let mediaServiceString = JSON.stringify(mediaServiceObj);
                GuildOptions.setOptions(interaction.guild.id, { serviceSettings: mediaServiceString }).then(() => {
                    interaction.reply({
                        content: `Service: ${mediaService} is now set to ${tiltedExternalOff}.`,
                        ephemeral: true
                    });
                });
            }

        });
    }
  );
  