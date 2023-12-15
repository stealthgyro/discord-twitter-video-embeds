const InstagramPost = require("./InstagramPost");
const { sh } = require("../util/Utils");
const log = require("../util/log");
const { snapsave } = require('@bochilteam/scraper');

class InstagramClient {
  async getPost(match) {
    const url = match[0];
    log.verbose("InstagramClient", `Got url: ${url}`);
    // This should be safe as our regexes earlier prevent any weirdness
    try {
      return await sh(`yt-dlp --cookies data/cookies.txt '${url.replace(/'/g, "'\\''")}' -j`).then((stdout) => {
        log.verbose("InstagramClient", `Got stdout: ${stdout}`);
        return new InstagramPost(JSON.parse(stdout));
      });
    } catch (ignored) {
      log.error("InstagramClient", ignored);
      try{
        var newObj = {};
        newObj.scraper = true;
        newObj.original_url = url;
        newObj.scraping = await snapsave(url);
        let scraping_string = JSON.stringify(newObj, null, 2);
        log.verbose("InstagramClient", `Got scraping: ${scraping_string}`);
        return new InstagramPost(newObj);
      }catch(err2){
        log.error("InstagramClient", err2);
      }
      // ignored
    }
    return;
  }
}

module.exports = new InstagramClient();
