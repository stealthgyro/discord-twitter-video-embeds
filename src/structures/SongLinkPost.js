const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const { MAX_DISCORD_UPLOAD, Colors, Favicons } = require("../util/Constants");

class SongLinkPost {
  constructor(data) {
    this.url = data.pageUrl;
    this.id = data.id;
    this.title = data.title;
    this.artists = [...data.artist];
    // this.createdAt = new Date();
    // If 1 artist, just use that, if 2 artists, join with and, and if more than 2, join with commas, and add "and" before the last one
    this.artist = "";
    if(this.artists.length == 1){
        this.artist = this.artists[0];
    } else if(this.artists.length == 2){
        this.artist = this.artists[0] + " and " + this.artists[1];
    } else {
        for(let i = 0; i < this.artists.length; i++){
            if(i == this.artists.length - 1){
                this.artist += " and " + this.artists[i];
            } else {
                this.artist += this.artists[i] + ", ";
            }
        }
    }

    // #WIP: FROM TIKTOK POST - Review A Start
    // filter best quality
    // intentionally picking the watermarked video cause i feel like thats more moral
    // if videos get shared
    // FIXME: pass guild into here somehow for upload limit
    const chosenFile = data.formats
      .filter((media) => media.filesize < MAX_DISCORD_UPLOAD && media.format.includes("Direct video"))
      .sort((a, b) => b.quality - a.quality)?.[0];

    if (!chosenFile) {
      return;
    }

    if (chosenFile.http_headers) {
      this._headers = chosenFile.http_headers;
    } else {
      this._headers = {};
    }
    this._videoUrl = chosenFile.url;
    // #WIP: FROM TIKTOK POST - Review A End
  }

  // #WIP: FROM TIKTOK POST - Review B Start
//   getDiscordAttachment(spoiler) {
//     if (this._videoUrl) {
//       return fetch(this._videoUrl, {
//         headers: this._headers
//       })
//         .then((response) => response.buffer())
//         .then((videoResponse) => {
//           return new AttachmentBuilder(videoResponse, { name: `${spoiler ? "SPOILER_" : ""}${this.id}.mp4` });
//         });
//     } else return;
//   }
  // #WIP: FROM TIKTOK POST - Review B End

  // #WIP: FROM TIKTOK POST - Review C Start
  getDiscordEmbed() {
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
    // if (this.likes) {
    //   embed.addFields({ name: "Likes", value: this.likes.toString(), inline: true });
    // }
    return embed;
  }
  // #WIP: FROM TIKTOK POST - Review C End
}

module.exports = SongLinkPost;
