const {
  AttachmentBuilder,
  EmbedBuilder
} = require("discord.js");
const fetch = require("node-fetch");
const {
  MAX_DISCORD_UPLOAD,
  Colors,
  Favicons,
  DEFAULT_SONG_SERVICES
} = require("../util/Constants");
const GuildOptions = require("./GuildOptions");
const log = require("../util/log");

class SongLinkPost {
  constructor(data) {
    this.url = data.pageUrl;
    this.id = data.id;
    this.title = data.title;
    this.artists = [...data.artist];
    this.linksByPlatform = data.linksByPlatform;
    // this.createdAt = new Date();
    // If 1 artist, just use that, if 2 artists, join with and, and if more than 2, join with commas, and add "and" before the last one
    this.artist = "";
    if (this.artists.length == 1) {
      this.artist = this.artists[0];
    } else if (this.artists.length == 2) {
      this.artist = this.artists[0] + " and " + this.artists[1];
    } else {
      for (let i = 0; i < this.artists.length; i++) {
        if (i == this.artists.length - 1) {
          this.artist += " and " + this.artists[i];
        } else {
          this.artist += this.artists[i] + ", ";
        }
      }
    }
  }

  getDiscordEmbed(options) {
    const embed = new EmbedBuilder();
    embed.setColor(Colors.SONG_LINK);
    embed.setFooter({
      text: "SongLink",
      iconURL: Favicons.SONG_LINK
    });
    embed.setURL(this.url);
    // embed.setTimestamp(this.createdAt);
    if (this.title == "") {
      this.title = "...";
    }
    embed.setTitle(this.title.substring(0, 200));
    embed.setAuthor({
      name: `${this.artist}`,
      //   url: this.authorUrl
    });
    const dbOptions = options;
    let musicServiceObj = {};
    if(dbOptions && dbOptions.musicServices){
      musicServiceObj = JSON.parse(dbOptions.musicServices)
    }else{
      musicServiceObj = DEFAULT_SONG_SERVICES;
    }
    for (let members in this.linksByPlatform) {
      if (musicServiceObj[members] == true) {
        embed.addFields({
          name: members,
          value: this.linksByPlatform[members]?.url,
          inline: true
        });
      }
    }
    return embed;
  }
}

module.exports = SongLinkPost;