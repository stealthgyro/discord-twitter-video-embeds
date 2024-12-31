const fetch = require("node-fetch");
// const ClientError = require("./ClientError");
const ClientError = require("./ClientError");
const GuildFlags = require("./GuildFlags");
const TwitterError = require("./TwitterError");
const TwitterErrorList = require("./TwitterErrorList");
const TwitterPost = require("./TwitterGuestPost");
const { EmbedModes, GENERIC_USER_AGENT } = require("../util/Constants");
const log = require("../util/log");

const TWITTER_GUEST_TOKEN =
  "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
const WEB_TWEET_ENDPOINT = (tweetID) => `https://twitter.com/LillianaFuture/status/${tweetID}`;
const GRAPHQL_TWEET_ENDPOINT = (tweetID, flags) => {
  return `https://twitter.com/i/api/graphql/OUKdeWm3g4tDbW5hffX_QA/TweetResultByRestId?variables={"tweetId":"${tweetID}","withCommunity":false,"includePromotedContent":false,"withVoice":false}&features=${JSON.stringify(
    flags
  )}`;
};
const GUEST_TOKEN_REGEX = /gt=(\d+); Max-Age=\d+;/;
// https://github.com/ytdl-org/youtube-dl/blob/master/youtube_dl/extractor/twitter.py
class TwitterGuestClient {
    getSetting(options, match){
      const dbOptions = options;
      let mediaServiceObj = {};
      if(dbOptions && dbOptions.serviceSettings){
        mediaServiceObj = JSON.parse(dbOptions.serviceSettings)
      }else{
        mediaServiceObj = DEFAULT_MEDIA_SERVICES;
      }
      var urlMatch = match[0];
      log.verbose("TwitterGuestClient(getSetting)", `Got urlMatch: ${urlMatch}`);
      try{
        return mediaServiceObj.twitter; // {tilted, external, off}
      }catch(ignored){
        log.error("TwitterGuestClient", ignored);
      }
      return;
    }
  _fetchGuestToken(id, incomingURL) {
    this.guestToken = "";
    this.cookie = "";
    log.verbose("TwitterGraphQLGuestClient", "id: " + id);
    return fetch(incomingURL, {
      headers: {
        "user-agent": GENERIC_USER_AGENT
      },
      redirect: "manual"
    })
      .then((res) => {
        const headers = res.headers[Object.getOwnPropertySymbols(res.headers)[0]];
        const cookies = headers["set-cookie"] ? headers["set-cookie"] : [];
        this.cookie = "";
        cookies.forEach((setCookie) => {
          this.cookie += setCookie.split(";")[0] + "; ";
        });
        log.verbose("TwitterGraphQLGuestClient", "got cookies");
        return fetch(incomingURL, {
          headers: {
            "user-agent": GENERIC_USER_AGENT,
            cookie: this.cookie
          }
        });
      })
      .then((res) => res.text())
      .then((html) => {
        const match = GUEST_TOKEN_REGEX.exec(html);
        if (match != null && match[1] != null) {
          this.guestToken = match[1];
        }
        log.verbose("TwitterGraphQLGuestClient", "got guest token");
        this.cookie += `gt=${this.guestToken}; `;
      });
  }

  _setFlags(error) {
    this.flags = {};
    error.message
      .replace("The following features cannot be null: ", "")
      .split(", ")
      .forEach((a) => (this.flags[a] = true));
  }

  // TODO: Renew client token when errors
  // eslint-disable-next-line no-unused-vars
  async getPost(match, options, isRetry = false) {
    log.verbose("TwitterGraphQLGuestClient", "getPost: match: " + match);
    const urlSansQueryParams = match[0].split("?")[0];
    const id = match[2];
    const twitfix = match[1] ? match[1] : "";
    if (!options.flags.has(GuildFlags.Flags.PARSE_TWITFIX) && twitfix != "") return "";
    if (twitfix != "" && options.mode === EmbedModes.VIDEO_REPLY) return "";
    if (this.guestToken == null) {
      await this._fetchGuestToken(id, urlSansQueryParams);
    }
    if (this.flags == null) {
      this.flags = {};
    }
    let res;
    try {
      res = await fetch(GRAPHQL_TWEET_ENDPOINT(id, this.flags), {
        headers: {
          authorization: TWITTER_GUEST_TOKEN,
          "user-agent": GENERIC_USER_AGENT,
          cookie: this.cookie,
          "x-guest-token": this.guestToken
        }
      });
    } catch (e) {
      if (e.type == "max-redirect") {
        this._fetchGuestToken(id);
        if (!isRetry) return this.getPost(match, options, true);
        return;
      } else {
        throw e;
      }
    }

    return res.text().then((res) => {
      let parsed;
      try {
        log.verbose("TwitterGraphQLGuestClient", "res: \n" + res);
        parsed = JSON.parse(res);
      } catch (error) {
        if (!isRetry) {
          return this._fetchGuestToken().then(() => this.getPost(match, options, true));
        }
        throw new ClientError("Error parsing JSON", "Twitter");
      }

      if (parsed.errors) {
        const isGuestTokenError = parsed.errors.filter(error => error.code === 239).length > 0;
        if (isGuestTokenError) {
          return this._fetchGuestToken().then(() => this.getPost(match, options, true));
        }
        const validationError = parsed.errors.filter((error) => error.code === 336);
        if (
          validationError[0] &&
          validationError[0].message.startsWith("The following features cannot be null") &&
          !isRetry
        ) {
          log.info("TwitterGraphQLGuestClient", "Updating features");
          this._setFlags(validationError[0]);
          return this.getPost(match, options, true);
        }
        throw new TwitterErrorList(parsed.errors.map((err) => new TwitterError(err)));
      }

      if (!parsed?.data?.tweetResult?.result?.legacy) {
        throw new ClientError(`Didn't recieve conversation data; ID:${id}`, "Twitter");
      }
      const tweetData = parsed?.data?.tweetResult?.result?.legacy;
      if(tweetData?.is_quote_status) {
        if(!parsed?.data?.tweetResult?.result?.quoted_status_result?.result?.legacy){
          throw new ClientError(`Didn't recieve quote data; ID:${id}`, "Twitter");
        }
        tweetData.quote_data = parsed?.data?.tweetResult?.result?.quoted_status_result?.result?.legacy;
      }
      if (!parsed?.data?.tweetResult?.result?.core?.user_results?.result?.legacy) {
        throw new ClientError(`Didn't recieve user data; ID:${id}`, "Twitter");
      }
      const user = parsed?.data?.tweetResult?.result?.core?.user_results?.result?.legacy;
      if(tweetData?.is_quote_status) {
        if(!parsed?.data?.tweetResult?.result?.quoted_status_result?.result?.core?.user_results?.result?.legacy){
          throw new ClientError(`Didn't recieve quote user data; ID:${id}`, "Twitter");
        }
        user.quote_data = parsed?.data?.tweetResult?.result?.quoted_status_result?.result?.core?.user_results?.result?.legacy;
      }
      const tweet = new TwitterPost(tweetData);
      tweet.addUserData(user);
      if (!tweet.videoUrl && options.flags.has(GuildFlags.Flags.TWITTER_ONLY_VIDEO)) return null;
      return tweet;
    });
  }
}

module.exports = new TwitterGuestClient();
