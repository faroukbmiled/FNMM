import nconf from "nconf";
nconf.argv().env().file({ file: "config.json" });
import dotenv from 'dotenv';
dotenv.config(); // loads .env variables if available
import type { PartyPrivacy } from "fnbr";
import type { Config } from "./types.js";

export const config: Config = {
  fortnite: {
    cid: nconf.get("fortnite:cid"),
    bid: nconf.get("fortnite:bid"),
    eid: nconf.get("fortnite:eid"),
    level: nconf.get("fortnite:level"),
    battle_pass_owned: nconf.get("fortnite:battle_pass_owned"),
    battle_pass_lvl: nconf.get("fortnite:battle_pass_lvl"),
    banner: nconf.get("fortnite:banner"),
    add_users: nconf.get("fortnite:add_users"),
    leave_party: nconf.get("fortnite:leave_party"),
    leave_time: nconf.get("fortnite:leave_time"),
    join_message: nconf.get("fortnite:join_message"),
    invite_status: nconf.get("fortnite:invite_status"),
    invite_onlinetype: nconf.get("fortnite:invite_onlinetype"),
    inuse_status: nconf.get("fortnite:inuse_status"),
    inuse_onlinetype: nconf.get("fortnite:inuse_onlinetype"),
    owner_epicid: nconf.get("fortnite:owner_epicid"),
  },
  logs: {
    enable_logs: nconf.get("logs:enable_logs"),
    channel: nconf.get("logs:channel"),
    name: nconf.get("logs:name"),
  },
  discord: {
    run_discord_client: nconf.get("discord:run_discord_client"),
    guild_slash_status_response: nconf.get(
      "discord:guild_slash_status_response"
    ),
    command_guild: nconf.get("discord:command_guild"),
    status: nconf.get("discord:status"),
    status_type: nconf.get("discord:status_type"),
  },
  system: {
    bot_owner_name: nconf.get("system:bot_owner_name"),
    bot_loading_message: nconf.get("system:bot_loading_message"),
    web_message: nconf.get("system:web_message"),
    version: nconf.get("system:version"),
  },
  env: {
    DISCORD_TOKEN: process.env["DISCORD_TOKEN"],
    DISCORD_BOT_OWNER: process.env["DISCORD_BOT_OWNER"],
  },
};

export const clientOptions: Record<any, any> = {
  defaultStatus: "Launching",
  auth: {
    deviceAuth: {},
  },
  debug: console.log,
  xmppDebug: false,
  platform: "WIN",
  partyConfig: {
    chatEnabled: true,
    maxSize: 4,
  },
};

export const deviceauths: Record<string, string | undefined> = {
  accountId: process.env["accountId"],
  deviceId: process.env["deviceId"],
  secret: process.env["secret"],
};

export const PrivateParty: PartyPrivacy = {
  partyType: "Private",
  inviteRestriction: "AnyMember",
  onlyLeaderFriendsCanJoin: true,
  presencePermission: "Anyone",
  invitePermission: "Anyone",
  acceptingMembers: true,
};

export enum AuthSessionStoreKey {
  Fortnite = "fortnite",
  FortniteClientCredentials = "fortniteClientCredentials",
  Launcher = "launcher",
}
