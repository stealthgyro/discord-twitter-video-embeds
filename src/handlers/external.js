const {
  PermissionsBitField,
  PermissionFlagsBits,
  GuildChannel,
  DiscordAPIError,
  RESTJSONErrorCodes
} = require("discord.js");
const videoReply = require("./videoReply");
const discord = require("../discord");
const { notifyPermissions, getUploadLimit } = require("../util/Utils");
const { getWebhook, resetWebhook } = require("../util/getWebhook");
const log = require("../util/log");

const REQUIRED_PERMISSIONS = new PermissionsBitField([
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ManageWebhooks
]);

module.exports = async function external(message, posts, retry = false) {
    // To suppress TS errors, even though we already handled that.
    if (!(message.channel instanceof GuildChannel)) return null;
    if (!message.channel.permissionsFor(discord.user.id).has(REQUIRED_PERMISSIONS)) {
      notifyPermissions(message, REQUIRED_PERMISSIONS, "external");
      return null;
    }

    const webhook = await getWebhook(message.channel);
    if (!webhook) return null;

    let old_urls = [];
    let new_urls = [];
    let serviceSettings = [];
    let providers = [];
    posts.forEach((post) => {
      if (!post) return;
      if (post.url && post.serviceSetting) {
        log.verbose("external", `Post URL: ${post.url}`);
        log.verbose("external", `Post Service Setting: ${post.serviceSetting}`);
        old_urls.push(post.url);
        let url_obj = readURL(post.url, post.serviceSetting);
        log.verbose("external", `URL Object: ${JSON.stringify(url_obj)}`);
        new_urls.push(url_obj.href);
      }
    });
    
    let content = message.content;

    // If there's no content, don't send an empty string
    if (content.trim() === "") content = undefined;
    
  // If both of these are empty, we can do nothing
  if (!content) return null;

  log.verbose("external", `Content(before): ${content}`);

  for (let i = 0; i < old_urls.length; i++) {
    content = content.replace(old_urls[i], new_urls[i]);
  }

  log.verbose("external", `Content(after): ${content}`);


    try {
      return await webhook
        .send({
          content,
          username: message.author.username,
          avatarURL: message.author.avatarURL({ format: "webp", size: 256 }),
          allowed_mentions: { parse: ["users"] }
        })
        .then((reply) => {
          try {
            message.delete();
          } catch (ignored) {
            //ignored
          }
          return reply;
        });
    } catch (error) {
      if (error instanceof DiscordAPIError) {
        switch (error.code) {
          case RESTJSONErrorCodes.UnknownWebhook:
            await resetWebhook(message.channel);
            if (retry === false) {
              return reEmbed(message, posts, true);
            }
            break;
          case RESTJSONErrorCodes.RequestEntityTooLarge:
            return videoReply(message, posts, true);
          case RESTJSONErrorCodes.UnknownMessage:
            break;
          default:
          // throw error;
        }
      }
    }
};

    /**
     * Takes a URL string and returns an object of the various parts.
     *
     * @param {string} str URL to process
     * @param {string} newHost Swap the host of the URL
     *
     * @example
     * readURL(url)
     *
     * @returns URL Object like location
     *
     * @since: v1.0.0
     */
    function readURL(str, newHost) {
      log.verbose("external(readURL)", `Got URL: ${str}`);
      if (!str || str.indexOf('http') != 0) {
          return {};
      }
      if(newHost){
        var newHostObj = readURL(newHost);
      }
      var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
          '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
          '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
          '(\\:\\d+)?(\\/[-a-z\\d%_.~+]?[^\\?|#|$]*)*' + // port and path
          '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
          '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locater
      var urlArr = pattern.exec(str);

      var protocol = '';
      if (urlArr[1]) {
          protocol = urlArr[1].split(":")[0];
      } else {
          protocol = 'https'; // default to https
      }
      protocol += ":";

      var urlObj = {};
      urlObj.protocol = urlArr[1] ? urlArr[1].replace("\/\/", "") : protocol;
      urlObj.port = urlArr[8] ? urlArr[8].replace(":", "") : '';
      if(newHostObj){
        urlObj.hostname = newHostObj.hostname;
        urlObj.host = newHostObj.host;
        urlObj.href = newHostObj.protocol + "//" + newHostObj.host + (urlArr[9] ? urlArr[9] : '') + (urlArr[10] ? urlArr[10] : '');
        urlObj.origin = newHostObj.protocol + "//" + newHostObj.host;
        urlObj.pathname = urlArr[9] ? urlArr[9] : '';
        urlObj.search = urlArr[10] ? urlArr[10] : '';
      }else{
        urlObj.hostname = urlArr[2] ? urlArr[2] : '';
        urlObj.host = urlObj.port ? urlObj.hostname + ":" + urlObj.port : urlObj.hostname;
        if (str.indexOf(protocol) === 0) {
            urlObj.href = str;
        } else {
            urlObj.href = protocol + "//" + str;
        }
        urlObj.origin = urlObj.protocol + "//" + urlObj.host;
        urlObj.pathname = urlArr[9] ? urlArr[9] : '';
        urlObj.search = urlArr[10] ? urlArr[10] : '';
      }


      log.verbose("external(readURL)", `URL Object: ${JSON.stringify(urlObj)}`);
      return urlObj;
  }


module.exports.REQUIRED_PERMISSIONS = REQUIRED_PERMISSIONS;
