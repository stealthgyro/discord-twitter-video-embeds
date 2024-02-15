const ClientError = require("./ClientError");
// const { USER_AGENT } = require("../util/Constants");
const log = require("../util/log");
const Odesli = require('odesli.js');

// 
class SongLink {
  async getPost(match) {
    log.verbose("SongLink", JSON.stringify(match));
    const url = match[0];
    try {
      const odesli = new Odesli();
      let song = await odesli.fetch(url);
      if (!song) {
        return;
      } else {
        log.verbose("SongLink", "song: " + song);
        return song;
      }
    } catch (err) {
      log.error("SongLink", err);
    }

  }
}

module.exports = new SongLink();