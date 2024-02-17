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
  const { DEFAULT_SONG_SERVICES } = require("../util/Constants");
  const log = require("../util/log");
  
  const command = new SlashCommandBuilder()
    .setName("togglemusicservices")
    .setDescription("Set which music services the song.link will attempt to embed.")
    .addStringOption(option =>
        option.setName('musicservice')
        .setDescription('Select the music service you are toggling to send or not.')
        .setRequired(true)
        .addChoices(
            { name: 'Amazon Music', value: 'amazonMusic' },
            { name: 'Amazon Music Store', value: 'amazonStore' },
            { name: 'Anghami', value: 'anghami' },
            { name: 'Boomplay', value: 'boomplay' },
            { name: 'Apple Music', value: 'appleMusic' },
            { name: 'Apple iTunes', value: 'itunes' },
            { name: 'Pandora', value: 'pandora' },
            { name: 'SoundCloud', value: 'soundcloud' },
            { name: 'Spotify', value: 'spotify' },
            { name: 'YouTube', value: 'youtube' },
            { name: 'YouTube Music', value: 'youtubeMusic' }
    ))
    .addBooleanOption(new SlashCommandBooleanOption().setName("active").setDescription("Reply song.link commands with services set to true."));
    
  
  module.exports = new Command(
    command,
    /**
     * @param {CommandInteraction} interaction - The title of the book.
     */
    function musicServiceToggle(interaction) {
        // @ts-ignore
        let active = interaction.options.getBoolean("active");
        // @ts-ignore
        let musicService = interaction.options.getString("musicservice");
        GuildOptions.getOptions(interaction.guild.id).then((options) => {
            let musicServiceObj = JSON.parse(options.musicServices) || DEFAULT_SONG_SERVICES;
            if( musicServiceObj[musicService] && musicServiceObj[musicService] == active){
                interaction.reply({
                    content: `Service: ${musicService} is already set to ${active}.`,
                    ephemeral: true
                });
                return;
            }else{
                musicServiceObj[musicService] = active;
                let musicServiceString = JSON.stringify(musicServiceObj);
                GuildOptions.setOptions(interaction.guild.id, { musicServiceString }).then(() => {
                    interaction.reply({
                        content: `Service: ${musicService} has been set to ${active}.`,
                        ephemeral: true
                    });
                });
            }
        });
    }
  );
  