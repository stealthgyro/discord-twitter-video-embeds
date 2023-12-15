const InstagramPost = require("./InstagramPost");
const { sh } = require("../util/Utils");

class InstagramClient {
  async getPost(match) {
    const url = match[0];
    // This should be safe as our regexes earlier prevent any weirdness
    try {
      return await sh(`yt-dlp '${url.replace(/'/g, "'\\''")}' -j`).then((stdout) => {
        return new InstagramPost(JSON.parse(stdout));
      });
    } catch (ignored) {
      // ignored
    }
    return;
  }
}

module.exports = new InstagramClient();
