const {
  DiscordAPIError,
  Constants: DiscordConstants,
  GuildChannel,
  ThreadChannel,
  Permissions
} = require("discord.js");
const { APIErrors, ChannelTypes } = DiscordConstants;
const discord = require("../discord");
const reCompose = require("../handlers/reCompose");
const reEmbed = require("../handlers/reEmbed");
const videoReply = require("../handlers/videoReply");
const GuildFlags = require("../structures/GuildFlags");
const GuildOptions = require("../structures/GuildOptions");
const MessageOwners = require("../structures/MessageOwners");
const { EmbedModes, QRT_UNROLL_BOTS, SAFEST_EMBED_MODE, MAX_DISCORD_MESSAGE_LENGTH } = require("../util/Constants");
const getPosts = require("../util/getPosts");
const log = require("../util/log");
const markdownParser = require("../util/markdownParser");

const ignoredErrors = [
  APIErrors.UNKNOWN_CHANNEL, // Race condition if channel is deleted before bot replies
  APIErrors.UNKNOWN_GUILD, // Race condition if kicked from server
  APIErrors.UNKNOWN_MESSAGE, // Race condition if message is deleted quickly
  APIErrors.CANNOT_SEND_EXPLICIT_CONTENT, // We have no way of checking
  APIErrors.SLOWMODE_RATE_LIMIT,
  APIErrors.MAXIMUM_THREAD_PARICIPANTS,
  APIErrors.INVALID_THREAD_ARCHIVE_STATE, // Race condition if thread is archived before bot replies
  APIErrors.MAXIMUM_WEBHOOKS,
  APIErrors.MISSING_PERMISSIONS,
  APIErrors.REQUEST_ENTITY_TOO_LARGE // Issues with calculating attachment size
];

function shouldProcessMessage(message) {
  // If the message doesn't have content
  if (!message.content) return false;
  // Do not respond to ourselves
  if (message.author.id === discord.user.id) return false;
  // Block bots, but reply to HiddenPhox (quote rt unrolling)
  if (message.author.bot && !QRT_UNROLL_BOTS.includes(message.author.id)) return false;
  // Check for a URL
  if (!/(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/.test(message.content)) return false;
  // If we're in a guild
  if (message.channel instanceof GuildChannel) {
    // Check to make sure we have permission to send in the channel we're going to send
    // if (!message.channel.permissionsFor(discord.user.id).has(Permissions.FLAGS.SEND_MESSAGES)) return false;
    // Check that the user sending the message has permissions to embed links
    if (!message.channel.permissionsFor(message.author.id).has(Permissions.FLAGS.EMBED_LINKS)) return false;
  }
  // Don't touch announcement channels
  if (message.channel.type === ChannelTypes.GUILD_NEWS) return false;
  // All checks passed
  return true;
}

async function sendMessage(message, posts, options) {
  try {
    switch (options.mode) {
      case EmbedModes.RE_COMPOSE:
        // We can't re-compose in a DM channel
        // I'm not optimistic that webhooks will work in threads
        if (
          message.channel instanceof GuildChannel &&
          !(message.channel instanceof ThreadChannel) &&
          message.content.length < MAX_DISCORD_MESSAGE_LENGTH
        ) {
          log.verbose("messageCreate sendMessage", "Chose RE_COMPOSE");
          return await reCompose(message, posts);
        }
        log.verbose("messageCreate sendMessage", "Fell-through RE_COMPOSE");

      // eslint-disable-next-line no-fallthrough
      case EmbedModes.RE_EMBED:
        // We can't re-embed in a DM channel
        if (message.channel instanceof GuildChannel || message.channel instanceof ThreadChannel) {
          log.verbose("messageCreate sendMessage", "Chose RE_EMBED");
          return await reEmbed(message, posts);
        }
        log.verbose("messageCreate sendMessage", "Fell-through RE_EMBED");
      // eslint-disable-next-line no-fallthrough
      case EmbedModes.VIDEO_REPLY:
      default:
        log.verbose("messageCreate sendMessage", "Chose VIDEO_REPLY");
        return await videoReply(message, posts);
    }
  } catch (error) {
    // @ts-ignore
    if (!(error instanceof DiscordAPIError && ignoredErrors.includes(error.code))) throw error;
    log.error("messageCreate sendMessage", error);
    return null;
  }
}

module.exports = async function handleMessage(message) {
  const startTime = Date.now();
  log.silly("messageCreate", "Got message");
  if (!shouldProcessMessage(message)) return null;
  log.verbose("messageCreate", "Passed initial checks");

  // Guild options
  let options = { mode: EmbedModes.VIDEO_REPLY, flags: new GuildFlags([]) }; // Default options
  if (message.channel instanceof GuildChannel || message.channel instanceof ThreadChannel) {
    const dbOptions = await GuildOptions.getOptions(message.guild.id);
    if (dbOptions) {
      options = dbOptions;
    }
  }
  log.verbose("messageCreate", "Got options:");
  log.verbose("messageCreate", options);

  const syntaxTree = markdownParser(message.content);
  log.verbose("messageCreate", "Got syntax tree");

  // Get all tweets from message, this starts fetching things in the background
  const postsPromises = getPosts(syntaxTree, options);
  log.verbose("messageCreate", "Got posts");

  // If we have no tweets there's no point in continuing
  // @ts-ignore
  if (postsPromises.length === 0) {
    log.verbose("messageCreate", "No valid posts");
    return null;
  }

  // Resolve all the posts
  const posts = await Promise.all(postsPromises);
  log.verbose("messageCreate", "Resolved all posts:");
  log.verbose("messageCreate", posts);

  // Check for links we cannot re-embed
  if (posts.includes(null)) {
    options.mode = SAFEST_EMBED_MODE;
    log.verbose("messageCreate", "Set mode to safest since message includes non-re-embedable content");
  }
  // at the request of cyn, do not proxy HiddenPhox's messages
  if (QRT_UNROLL_BOTS.includes(message.author.id) && options.mode === EmbedModes.RE_COMPOSE) {
    options.mode = EmbedModes.RE_EMBED;
    log.verbose("messageCreate", "Set mode to RE_EMBED from RE_COMP0SE for hiddenphox");
  }

  // No embedable links
  if (!posts.find((post) => post !== null)) {
    log.verbose("messageCreate", "No embedable links");
    return null;
  }

  // Finally send the message
  const response = await sendMessage(message, posts, options);
  if (typeof response === "object" && response instanceof Array) {
    const [responseMessage, details] = response;
    // Some quick analytics, curiosity and it makes me feel happy when people use the bot
    log.info(
      `Handled message with mode (${details.mode}${details.fallback ? "!!" : ""}) with providers (${posts
        .map((post) => post.provider)
        .join(",")}) in ${Date.now() - startTime}ms`
    );
    // Add to message mappings
    MessageOwners.setOwner(message, responseMessage);
  }
};
