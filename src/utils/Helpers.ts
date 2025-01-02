import { EmbedBuilder, ColorResolvable, CommandInteraction } from "discord.js";
import type { ReceivedFriendMessage } from "fnbr";
import { config } from "./Config.js";
import { dclient } from "./discordClient.js";
import stringSimilarity from "string-similarity";
import axios from "axios";
import path from "path";
import fs from "fs";
import crypto from "crypto";

let cosmetics: any[] = [];

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function discordlog(
  title: string,
  content: string,
  color: ColorResolvable,
  interaction: CommandInteraction | null = null,
  followup: boolean = false
): Promise<void> {
  if (!config.discord.run_discord_client) return;
  const channel = dclient.channels.cache.get(config.logs.channel);
  const logs = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(content);
  try {
    if (interaction && !followup) {
      await interaction.reply({ embeds: [logs] });
    } else if (interaction && followup) {
      await sleep(500);
      await interaction.followUp({ embeds: [logs] });
    } else {
      await (channel as any).send({ embeds: [logs] });
    }
  } catch (e) {
    console.log(e);
    try {
      if (interaction) {
        const channelid = interaction.channelId;
        const fallBack = dclient.channels.cache.get(channelid);
        console.log("error triggered fallback: ", channelid);
        await (fallBack as any).send({ embeds: [logs] });
      } else {
        await (channel as any).send({ embeds: [logs] });
      }
    } catch (e) {
      console.log(
        "Failed to send discord log, restart the bot and verify your config " +
        "(channel id / guild id / discord bot token (env variable))\n" +
        "If you're not using the discord bot, set 'run_discord_client' in config to false"
      );
      console.log(e);
    }
  }
}

export async function calcChecksum(
  ticketPayload: string,
  signature: string
): Promise<string> {
  const plaintext =
    ticketPayload.slice(10, 20) +
    Buffer.from("RG9uJ3RNZXNzV2l0aE1NUw==", "base64").toString("utf-8") +
    signature.slice(2, 10);
  const data: any = Buffer.from(plaintext, "utf16le");
  const sha1 = crypto.createHash("sha1").update(data).digest();
  const checksumBuffer = sha1.subarray(2, 10);
  const checksum = checksumBuffer.toString("hex").toUpperCase();
  return checksum;
}

export async function UpdateCosmetics(): Promise<void> {
  console.log("Updating cosmetics...");
  const CosApiUrl = "https://fortnite-api.com/v2/cosmetics/br";
  const filePath = path.join(process.cwd(), "cosmetics.json");

  try {
    const response = await axios.get(CosApiUrl);
    const jsonCos = response.data;
    fs.writeFileSync(filePath, JSON.stringify(jsonCos.data, null, 2));
    console.log("Done updating cosmetics!");
  } catch (error) {
    console.error("An error occurred while updating cosmetics:", error);
  }

  fs.readFile("cosmetics.json", "utf8", (err, data) => {
    if (err) {
      console.error("Error reading cosmetics.json:", err);
      return [];
    }
    try {
      cosmetics = JSON.parse(data);
      console.log("Cosmetics data loaded successfully.");
      return cosmetics;
    } catch (error) {
      console.error("Error parsing cosmetics.json:", error);
      return [];
    }
  });
}

export const findCosmetic = (
  query: string,
  type: string,
  message: ReceivedFriendMessage | null,
  discord: boolean | undefined = false
): any => {
  const queryLower = query.toLowerCase();
  const matchingCosmetics = cosmetics?.filter(
    (c: any) => c.type.value === type
  );

  const exactMatches = matchingCosmetics.filter(
    (c: any) =>
      c.id.toLowerCase() === queryLower || c.name.toLowerCase() === queryLower
  );

  if (exactMatches.length > 0) {
    if (discord) return { cosmeticmatch: exactMatches[0], exists: true };
    else return exactMatches[0];
  }
  const allNames = matchingCosmetics.map((c: any) => c.name.toLowerCase());
  const closestMatches = stringSimilarity.findBestMatch(queryLower, allNames);

  if (closestMatches.bestMatch.rating > 0.5) {
    const closestCosmetic = matchingCosmetics.find(
      (c: any) => c.name.toLowerCase() === closestMatches.bestMatch.target
    );
    try {
      message?.reply(`Did you mean ${closestMatches.bestMatch.target}?`);
      return closestCosmetic;
    } catch (e) {
      return {
        cosmeticmatch: closestCosmetic,
        exists: false,
      };
    }
  }
  return null;
};

export function stringToBool(value: string): boolean {
  return value.toLowerCase() === "true";
}
