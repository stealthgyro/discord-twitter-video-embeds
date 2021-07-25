import { registerMessage } from "../structures/MessageMappings.js";
import { DiscordAPIError } from "discord.js";

/** @param {Promise[]} tweetPromises */
/** @param {import("discord.js").Message} message */
export default async function videoReply(tweetPromises, message) {
	const tweets = await Promise.all(tweetPromises);
	// Make an array of urls, with spoiler marks if needed, then join them
	const content = tweets
		.map((tweet) => {
			if (!tweet || !tweet.tweet.bestVideo) return;
			const videoUrl = tweet.tweet.bestVideo.url;
			return tweet.spoiler ? "|| " + videoUrl + " ||" : videoUrl;
		})
		.join(" ");
	// Make sure we're not sending an empty message
	if (content.trim() === "") return;
	try {
		const response = await message.reply({ content });
		registerMessage(response, message);
	} catch (error) {
		if (!(error instanceof DiscordAPIError)) {
			throw error;
		}
	}
}