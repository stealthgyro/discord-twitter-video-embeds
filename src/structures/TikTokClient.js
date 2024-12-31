const TikTokPost = require("./TikTokPost");
const { sh } = require("../util/Utils");

class TikTokClient {
    getSetting(options, match){
      const dbOptions = options;
      let mediaServiceObj = {};
      if(dbOptions && dbOptions.serviceSettings){
        mediaServiceObj = JSON.parse(dbOptions.serviceSettings)
      }else{
        mediaServiceObj = DEFAULT_MEDIA_SERVICES;
      }
      var urlMatch = match[0];
      log.verbose("TikTokClient(getSetting)", `Got urlMatch: ${urlMatch}`);
      try{
        return mediaServiceObj.tiktok; // {tilted, external, off}
      }catch(ignored){
        log.error("TikTokClient", ignored);
      }
      return;
    }
  async getPost(match) {
    const url = match[0];
    // This should be safe as our regexes earlier prevent any weirdness
    try {
      return await sh(`yt-dlp '${url.replace(/'/g, "'\\''")}' -j`).then((stdout) => {
        return new TikTokPost(JSON.parse(stdout));
      });
    } catch (ignored) {
      // ignored
    }
    return;
  }
}

module.exports = new TikTokClient();
