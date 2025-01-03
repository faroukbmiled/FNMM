import axios, { AxiosError } from "axios";
import { Express } from "express";
import { ExpressApp } from "./utils/Express.js";
import fnbr, {
  ClientParty,
  ClientPartyMember,
  PartyMember,
  ReceivedPartyInvitation,
  IncomingPendingFriend,
  ReceivedFriendMessage,
} from "fnbr";
import os from "os";
import GetVersion from "./utils/version.js";
import {
  discordlog,
  UpdateCosmetics,
  findCosmetic,
  sleep,
} from "./utils/Helpers.js";
import {
  config,
  clientOptions,
  deviceauths,
  PrivateParty,
} from "./utils/Config.js";
import { dclient, setUpDClient } from "./utils/discordClient.js";
import setupInteractionHandler from "./utils/interactionHandler.js";
import { handleCommand } from "./utils/commandHandler.js";
import { startMatchmaking } from "./utils/Matchmaking.js";
import type { AxiosErrorResponseData } from "./utils/types.js";

UpdateCosmetics();
const app: Express = ExpressApp;
let timerstatus: boolean = false;
let timerId: NodeJS.Timeout | undefined = undefined;
setUpDClient();

(async () => {
  const latest = await GetVersion();
  const Platform = os.platform() === "win32" ? "Windows" : os.platform();
  const UserAgent = `Fortnite/${latest.replace(
    "-Windows",
    ""
  )} ${Platform}/${os.release()}`;

  axios.defaults.headers["user-agent"] = UserAgent;
  console.log("UserAgent set to", axios.defaults.headers["user-agent"]);
  clientOptions.auth.deviceAuth = deviceauths;
  const client = new fnbr.Client(clientOptions);
  await client.login();
  console.log(`[LOGS] Logged in as ${client?.user?.self?.displayName}`);
  const fnbrclient = client;
  client.setStatus(
    config.fortnite.invite_status,
    config.fortnite.invite_onlinetype
  );
  await client?.party?.me.setOutfit(config.fortnite.cid);
  await client?.party?.setPrivacy(PrivateParty).catch((e) => console.log(e));
  await client?.party?.me.setLevel(config.fortnite.level);
  await client?.party?.me.setBattlePass(
    config.fortnite.battle_pass_owned,
    config.fortnite.battle_pass_lvl,
    100,
    100
  );
  await client?.party?.me?.setBanner(config.fortnite.banner, "black");
  await client?.party?.me.setBackpack(config.fortnite.bid);

  setupInteractionHandler(
    dclient,
    fnbrclient,
    discordlog,
    config,
    findCosmetic,
    timerstatus,
    timerId
  );

  axios.interceptors.response.use(undefined, function (error: AxiosError) {
    if (error.response) {
      const data = error?.response?.data as AxiosErrorResponseData;
      if (data.errorCode && client && client.party) {
        client.party.sendMessage(
          `Axios HTTP Error: ${error.response.status} ${data.errorCode} ${data.errorMessage}`
        );
      }

      console.error(error.response.status, error.response.data);
      if (config.logs.enable_logs === true) {
        console.log(`Axios Error: ${error.response.status}`,
          `**${data.errorMessage}**`);
        discordlog(
          `Axios Error: ${error.response.status}`,
          `**${data.errorMessage}**`,
          0x880808
        );
      } else return;
    }

    return error;
  });

  let bIsMatchmaking = false;

  client.on("party:updated", async (updatedParty: ClientParty) => {
    switch (updatedParty.meta.schema["Default:PartyState_s"]) {
      case "BattleRoyalePreloading": {
        const loadout = client?.party?.me.meta.set("Default:LobbyState_j", {
          LobbyState: {
            hasPreloadedAthena: true,
          },
        });

        await client?.party?.me.sendPatch({
          "Default:LobbyState_j": loadout,
        });

        break;
      }

      case "BattleRoyaleMatchmaking": {
        if (bIsMatchmaking) {
          console.log("Members already started matchmaking!");
          return;
        }

        if (config.logs.enable_logs) {
          console.log(`[${"Matchmaking"}]`, "Matchmaking Started");
        }

        if (config.logs.enable_logs === true) {
          discordlog(
            "[Logs] Matchmaking",
            "Members started Matchmaking!",
            0x00ffff
          );
        }

        bIsMatchmaking = true;

        // Initiate matchmaking websocket and its event listeners
        startMatchmaking(client, updatedParty, config.logs.enable_logs, bIsMatchmaking);

        setTimeout(() => {
          if (bIsMatchmaking) {
            if (client.party?.me?.isReady) {
              client.party.me.setReadiness(false).catch((e) => console.log(e));
            }
            bIsMatchmaking = false;
          }
        }, 30000);

        break;
      }

      case "BattleRoyalePostMatchmaking": {
        try {
          if (!bIsMatchmaking) return;
          if (config.logs.enable_logs) {
            console.log(
              `[${"Party"}]`,
              "Players entered loading screen, Exiting party..."
            );
          }
          if (config.logs.enable_logs === true) {
            console.log("Members now in game.")
            discordlog(
              "[Logs] Matchmaking",
              "Members now in game.",
              0xffa500
            );
          } else return;

          if (client.party?.me?.isReady) {
            console.log("trying to set ready to false")
            client.party.me.setReadiness(false).catch((e) => console.log(e));;
            console.log("set ready to false")
          }
          await sleep(2000);
          bIsMatchmaking = false;
          if (config.fortnite.leave_party) {
            client?.party?.leave();
            console.log("Leaving party...")
            discordlog(
              "[Logs] Matchmaking",
              "Leaving party...",
              0xffa500
            );
            break;
          }
          break;
        } catch (e) { console.log(e) }
      }

      case "BattleRoyaleView": {
        break;
      }

      default: {
        if (config.logs.enable_logs) {
          console.log(
            `[${"Party"}]`,
            "Unknow PartyState",
            updatedParty.meta.schema["Default:PartyState_s"]
          );
        }
        break;
      }
    }
  });

  client.on("friend:message", (m: ReceivedFriendMessage) =>
    handleCommand(m, m.author, client, timerstatus, timerId)
  );

  client.on(
    "party:member:updated",
    async (Member: ClientPartyMember | PartyMember) => {
      try {
        if (Member.id == client?.user?.self?.id) {
          return;
        }

        if (!client?.party?.me) {
          return;
        }

        if ((Member.isReady && (client?.party?.me?.isLeader || Member.isLeader) && !client.party?.me?.isReady)) {
          if (client.party?.me?.isLeader) {
            await Member.promote();
          }
          client?.party?.me.setReadiness(true);
        } else if ((!Member.isReady && Member.isLeader) && !client?.party) {
          try {
            if (!client.xmpp.isConnected) {
              client.xmpp.disconnect();;
            } else {
              console.log(`[ERROR] WebSocket connection is not available or already closed.`);
            }
          } catch (e) {
            console.log(`[ERROR] ${e}`);
          }

          client?.party?.me.setReadiness(false);
        }

        var bAllmembersReady = true;

        client?.party?.members.forEach(
          (member: ClientPartyMember | PartyMember) => {
            if (!bAllmembersReady) {
              return;
            }

            bAllmembersReady = member.isReady;
          }
        );
      }
      catch (e) { console.log(e) }
    })

  client.on("friend:request", async (request: IncomingPendingFriend) => {
    try {
      if (config.fortnite.add_users === true) {
        await request.accept();
      } else if (config.fortnite.add_users === false) {
        await request.decline();
        client?.party?.chat.send(
          `Sorry, ${request.displayName} I dont accept friend requests!`
        ).catch((e) => console.log(e));
      }
    } catch (e) {
      console.log(e);
      discordlog(
        "[Logs] Friend Request:",
        `Failed to accept friend request, please try again`,
        0x880808
      );
    }
  });

  client.on("party:invite", async (request: ReceivedPartyInvitation) => {
    try {
      console.log("Received party invite")
      await client.party?.fetch();
      const party = client.party;
      if (party?.size === 1) {
        await request.accept();
      } else {
        await request.decline();
      }
    } catch (e) {
      console.log(e);
      discordlog(
        "[Logs] Party Invite:",
        `Failed to join Party, please try again`,
        0x880808
      );
    }
  });

  timerstatus = false;

  client.on(
    "party:member:joined",
    async (join: PartyMember | ClientPartyMember) => {
      try {
        // workaround for some patch delay errors
        await sleep(2000);

        await client?.party?.me.fetch();

        client?.party?.me.sendPatch({
          "Default:AthenaCosmeticLoadout_j":
            '{"AthenaCosmeticLoadout":{"cosmeticStats":[{"statName":"TotalVictoryCrowns","statValue":0},{"statName":"TotalRoyalRoyales","statValue":999},{"statName":"HasCrown","statValue":0}]}}',
        }).catch(err => {
          console.log(err);
        });

        await client?.party?.me.setOutfit(config.fortnite.cid).catch(err => {
          console.log(err);
        });

        const partyLeader = join.party.leader;
        await partyLeader?.fetch();
        const partyLeaderDisplayName = partyLeader?.displayName;
        const botDisplayName = client?.user?.self?.displayName;
        const finalUsedDisplayName =
          partyLeaderDisplayName === botDisplayName
            ? `BOT ${botDisplayName}`
            : partyLeaderDisplayName;
        console.log(`Joined ${finalUsedDisplayName}'s Party`);

        if (config.logs.enable_logs) {
          discordlog(
            "[Logs] Party:",
            `Joined **${finalUsedDisplayName}**'s party`,
            0x00ffff
          );
        } else return;

        const party = client.party;
        await client?.party?.me.setBackpack(config.fortnite.bid);
        await sleep(1500);

        async function leavepartyexpire() {
          try {
            client?.party?.chat.send("Time expired!").catch((e) => console.log(e));
            await sleep(1200);
            client?.party?.leave();
            console.log("[PARTY] Left party due to party time expiring!");

            if (config.logs.enable_logs) {
              discordlog("[Logs] Party:", "Party Time expired.", 0xffa500);
            } else return;

            console.log("[PARTY] Time tracking stopped!");
            timerstatus = false;
          } catch (e) {
            console.log(e);
            discordlog(
              "[Logs] Party:",
              `Failed to leave party due to an error`,
              0x880808
            );
          }

        }

        if (party?.size !== 1) {
          const ownerInLobby = party?.members.find(
            (member: ClientPartyMember | PartyMember) =>
              member.id === config.fortnite.owner_epicid
          );

          if (ownerInLobby) {
            console.log(
              `Timer has been disabled because ${ownerInLobby.displayName} is in the lobby!`
            );
            client?.party?.chat.send(
              `Timer has been disabled because ${ownerInLobby.displayName} is in the lobby!`
            ).catch((e) => console.log(e));

            discordlog(
              "[Logs] Timer:",
              `Timer has been disabled because **${ownerInLobby.displayName}** is in the lobby!`,
              0x00ffff
            );
            timerstatus = false;
          } else {
            console.log("[PARTY] Time has started!");
            client?.party?.chat.send(
              `Timer has started, ready up before the bot leaves`
            ).catch((e) => console.log(e));
            timerId = setTimeout(leavepartyexpire, config.fortnite.leave_time);
            timerstatus = true;
          }
        }

        await client?.party?.fetch();

        client?.party?.me.setEmote(config.fortnite.eid).catch((e) => console.log(e));

        switch (party?.size) {
          case 1:
            client.setStatus(
              config.fortnite.invite_status,
              config.fortnite.invite_onlinetype
            );
            await client?.party?.setPrivacy(PrivateParty).catch((e) => console.log(e));
            if (client.party?.me?.isReady) {
              client.party.me.setReadiness(false).catch((e) => console.log(e));;
            }
            if (timerstatus) {
              timerstatus = false;
              clearTimeout(timerId);
              console.log("[PARTY] Time has stopped!");
            }
            break;
          case 2:
          case 3:
          case 4:
            client?.party?.chat.send(
              `${config.fortnite.join_message}\n Bot By Ryuk`
            ).catch((e) => console.log(e));
            client.setStatus(
              config.fortnite.inuse_status,
              config.fortnite.inuse_onlinetype
            );
            break;
          default:
            console.warn(`Unexpected party size: ${party?.size}`);
            break;
        }
      } catch (e) {
        console.log(e);
        discordlog(
          "[Logs] Party:",
          `Failed to join party, leaving...`,
          0x00ffff
        );
        try { await client?.party?.leave(); } catch (error) { console.error(error); } // prettier-ignore
      }
    }
  );

  client.on("party:member:left", async (left: PartyMember) => {
    try {
      console.log(`Member left: ${left.displayName}`);

      if (config.logs.enable_logs) {
        discordlog(
          "[Logs] Party Members:",
          `**${left.displayName}** has left.`,
          0xffa500
        );
      }

      const party = client.party;
      if (!party) {
        console.warn("No party instance available.");
        return;
      }

      await party.fetch();
      const partySize = party.size;

      switch (partySize) {
        case 1:
          client.setStatus(
            config.fortnite.invite_status,
            config.fortnite.invite_onlinetype
          );
          await party.setPrivacy(PrivateParty).catch((e) => console.log(e));

          if (party.me?.isReady) {
            await party.me.setReadiness(false).catch((e) => console.log(e));;
          }

          if (timerstatus) {
            timerstatus = false;
            clearTimeout(timerId);
            console.log("[PARTY] Time has stopped!");
          }
          break;

        case 2:
        case 3:
        case 4:
          party.chat
            .send(`${config.fortnite.join_message}\n Bot By Ryuk`)
            .catch((e) => console.log(e));
          client.setStatus(
            config.fortnite.inuse_status,
            config.fortnite.inuse_onlinetype
          );
          break;

        default:
          console.warn(`Unexpected party size: ${partySize}`);
          break;
      }
    } catch (e) {
      console.log(e);
    }
  });

  if (config.discord.run_discord_client === true) {
    dclient.login(config.env.DISCORD_TOKEN);
  } else if (config.discord.run_discord_client === false) {
    console.log("[DISCORD] client is disabled!");
  }
})();
