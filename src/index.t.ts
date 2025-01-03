import axios, { AxiosError } from "axios";
import { Express } from "express";
import { ExpressApp } from "./utils/Express.js";
import os from "os";
import fnbr, {
    ClientParty,
    ClientPartyMember,
    PartyMember,
    ReceivedPartyInvitation,
    IncomingPendingFriend,
    ReceivedFriendMessage,
} from "fnbr";
import {
    discordlog,
    // UpdateCosmetics,
    // findCosmetic,
    sleep,
} from "./utils/Helpers.js";
import {
    config,
    PrivateParty,
} from "./utils/Config.js";
// import { dclient, setUpDClient } from "./utils/discordClient.js";
// import setupInteractionHandler from "./utils/interactionHandler.js";
import { handleCommand } from "./utils/commandHandler.js";
import { startMatchmaking } from "./utils/Matchmaking.js";
import type { AxiosErrorResponseData } from "./utils/types.js";
import GetVersion from "./utils/version.js";

class FortniteBot {
    private client: fnbr.Client;
    private deviceAuth: any;
    private timerStatus: boolean = false;
    private timerId: NodeJS.Timeout | undefined;
    private bIsMatchmaking: boolean = false;

    constructor(deviceAuth: any) {
        this.deviceAuth = deviceAuth;
        this.client = new fnbr.Client({
            auth: { deviceAuth: this.deviceAuth },
        });
    }

    async initialize() {
        await this.setupClient();
        this.setupEventHandlers();
    }

    private async setupClient() {
        const latest = await GetVersion();
        const Platform = os.platform() === "win32" ? "Windows" : os.platform();
        const UserAgent = `Fortnite/${latest.replace(
            "-Windows",
            ""
        )} ${Platform}/${os.release()}`;

        axios.defaults.headers["user-agent"] = UserAgent;
        console.log("UserAgent set to", axios.defaults.headers["user-agent"]);

        await this.client.login();
        console.log(`[LOGS] Logged in as ${this.client.user?.self?.displayName}`);
        this.client.setStatus(
            config.fortnite.invite_status,
            config.fortnite.invite_onlinetype
        );

        await this.client.party?.me.setOutfit(config.fortnite.cid);
        await this.client.party?.setPrivacy(PrivateParty);
        await this.client.party?.me.setLevel(config.fortnite.level);
        await this.client.party?.me.setBattlePass(
            config.fortnite.battle_pass_owned,
            config.fortnite.battle_pass_lvl,
            100,
            100
        );
        await this.client.party?.me?.setBanner(config.fortnite.banner, "black");
        await this.client.party?.me.setBackpack(config.fortnite.bid);

        // setupInteractionHandler(
        //   dclient,
        //   this.client,
        //   discordlog,
        //   config,
        //   findCosmetic,
        //   this.timerStatus,
        //   this.timerId
        // );
    }

    private setupEventHandlers() {
        this.client.on("party:updated", (updatedParty: ClientParty) =>
            this.handlePartyUpdated(updatedParty)
        );

        this.client.on("friend:message", (m: ReceivedFriendMessage) =>
            handleCommand(m, m.author, this.client, this.timerStatus, this.timerId)
        );

        this.client.on("friend:request", async (request: IncomingPendingFriend) =>
            this.handleFriendRequest(request)
        );

        this.client.on("party:member:updated", async (Member: ClientPartyMember | PartyMember) =>
            this.handlePartyMemberUpdate(Member)
        );

        this.client.on("party:invite", async (request: ReceivedPartyInvitation) =>
            this.handlePartyInvite(request)
        );

        this.client.on(
            "party:member:joined",
            async (join: PartyMember | ClientPartyMember) =>
                this.handlePartyMemberJoined(join)
        );

        this.client.on("party:member:left", async (left: PartyMember) =>
            this.handlePartyMemberLeft(left)
        );

        axios.interceptors.response.use(undefined, (error: AxiosError) =>
            this.handleAxiosError(error)
        );
    }

    private async handlePartyUpdated(updatedParty: ClientParty) {
        // Handle party state updates
        const state = updatedParty.meta.schema["Default:PartyState_s"];
        switch (state) {
            case "BattleRoyalePreloading":
                this.handlePreloadingState();
                break;
            case "BattleRoyaleMatchmaking":
                this.handleMatchmakingState(updatedParty);
                break;
            case "BattleRoyalePostMatchmaking":
                this.handlePostMatchmakingState();
                break;
            default:
                console.log("Unknown Party State:", state);
                break;
        }
    }

    private async handlePartyMemberUpdate(Member: ClientPartyMember | PartyMember) {
        try {
            if (Member.id == this.client?.user?.self?.id) {
                return;
            }

            if (!this.client?.party?.me) {
                return;
            }

            if ((Member.isReady && (this.client?.party?.me?.isLeader || Member.isLeader) && !this.client.party?.me?.isReady)) {
                if (this.client.party?.me?.isLeader) {
                    await Member.promote();
                }
                this.client?.party?.me.setReadiness(true);
            } else if ((!Member.isReady && Member.isLeader) && !this.client?.party) {
                try {
                    if (!this.client.xmpp.isConnected) {
                        this.client.xmpp.disconnect();;
                    } else {
                        console.log(`[ERROR] WebSocket connection is not available or already closed.`);
                    }
                } catch (e) {
                    console.log(`[ERROR] ${e}`);
                }

                this.client?.party?.me.setReadiness(false);
            }

            var bAllmembersReady = true;

            this.client?.party?.members.forEach(
                (member: ClientPartyMember | PartyMember) => {
                    if (!bAllmembersReady) {
                        return;
                    }

                    bAllmembersReady = member.isReady;
                }
            );
        }
        catch (e) { console.log(e) }
    }

    private async handlePreloadingState() {
        const loadout = this.client.party?.me.meta.set("Default:LobbyState_j", {
            LobbyState: { hasPreloadedAthena: true },
        });
        await this.client.party?.me.sendPatch({
            "Default:LobbyState_j": loadout,
        });
    }

    private async handleMatchmakingState(updatedParty: ClientParty) {
        if (this.bIsMatchmaking) {
            console.log("Matchmaking already started!");
            return;
        }

        console.log("Matchmaking Started");
        this.bIsMatchmaking = true;

        startMatchmaking(this.client, updatedParty, true, this.bIsMatchmaking);

        setTimeout(() => {
            if (this.bIsMatchmaking) {
                if (this.client.party?.me?.isReady) {
                    this.client.party.me.setReadiness(false).catch((e) => console.log(e));
                }
                this.bIsMatchmaking = false;
            }
        }, 30000);
    }

    private async handlePostMatchmakingState() {
        try {
            if (!this.bIsMatchmaking) return;
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

            if (this.client.party?.me?.isReady) {
                console.log("trying to set ready to false")
                this.client.party.me.setReadiness(false).catch((e) => console.log(e));;
                console.log("set ready to false")
            }
            await sleep(2000);
            this.bIsMatchmaking = false;
            if (config.fortnite.leave_party) {
                this.client?.party?.leave();
                console.log("Leaving party...")
                discordlog(
                    "[Logs] Matchmaking",
                    "Leaving party...",
                    0xffa500
                );
                return;
            }
            return;
        } catch (e) { console.log(e) }
    }

    private async handleFriendRequest(request: IncomingPendingFriend) {
        if (config.fortnite.add_users) {
            await request.accept();
        } else {
            await request.decline();
            this.client.party?.chat.send(
                `Sorry, ${request.displayName}, I don't accept friend requests!`
            );
        }
    }

    private async handlePartyInvite(request: ReceivedPartyInvitation) {
        await this.client.party?.fetch();
        const party = this.client.party;
        if (party?.size === 1) {
            await request.accept();
        } else {
            await request.decline();
        }
    }

    private async handlePartyMemberJoined(join: PartyMember | ClientPartyMember) {
        try {
            // workaround for some patch delay errors
            await sleep(2000);

            await this.client?.party?.me.fetch();

            this.client?.party?.me.sendPatch({
                "Default:AthenaCosmeticLoadout_j":
                    '{"AthenaCosmeticLoadout":{"cosmeticStats":[{"statName":"TotalVictoryCrowns","statValue":0},{"statName":"TotalRoyalRoyales","statValue":999},{"statName":"HasCrown","statValue":0}]}}',
            }).catch(err => {
                console.log(err);
            });

            await this.client?.party?.me.setOutfit(config.fortnite.cid).catch(err => {
                console.log(err);
            });

            const partyLeader = join.party.leader;
            await partyLeader?.fetch();
            const partyLeaderDisplayName = partyLeader?.displayName;
            const botDisplayName = this.client?.user?.self?.displayName;
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

            const party = this.client.party;
            await this.client?.party?.me.setBackpack(config.fortnite.bid);
            await sleep(1500);

            const leavepartyexpire = async () => {
                try {
                    this.client?.party?.chat.send("Time expired!").catch((e) => console.log(e));
                    await sleep(1200);
                    this.client?.party?.leave();
                    console.log("[PARTY] Left party due to party time expiring!");

                    if (config.logs.enable_logs) {
                        discordlog("[Logs] Party:", "Party Time expired.", 0xffa500);
                    } else return;

                    console.log("[PARTY] Time tracking stopped!");
                    this.timerStatus = false;
                } catch (e) {
                    console.log(e);
                    discordlog(
                        "[Logs] Party:",
                        `Failed to leave party due to an error`,
                        0x880808
                    );
                }
            };

            if (party?.size !== 1) {
                const ownerInLobby = party?.members.find(
                    (member: ClientPartyMember | PartyMember) =>
                        member.id === config.fortnite.owner_epicid
                );

                if (ownerInLobby) {
                    console.log(
                        `Timer has been disabled because ${ownerInLobby.displayName} is in the lobby!`
                    );
                    this.client?.party?.chat.send(
                        `Timer has been disabled because ${ownerInLobby.displayName} is in the lobby!`
                    ).catch((e) => console.log(e));

                    discordlog(
                        "[Logs] Timer:",
                        `Timer has been disabled because **${ownerInLobby.displayName}** is in the lobby!`,
                        0x00ffff
                    );
                    this.timerStatus = false;
                } else {
                    console.log("[PARTY] Time has started!");
                    this.client?.party?.chat.send(
                        `Timer has started, ready up before the bot leaves`
                    ).catch((e) => console.log(e));
                    this.timerId = setTimeout(leavepartyexpire, config.fortnite.leave_time);
                    this.timerStatus = true;
                }
            }

            await this.client?.party?.fetch();

            this.client?.party?.me.setEmote(config.fortnite.eid).catch((e) => console.log(e));

            switch (party?.size) {
                case 1:
                    this.client.setStatus(
                        config.fortnite.invite_status,
                        config.fortnite.invite_onlinetype
                    );
                    await this.client?.party?.setPrivacy(PrivateParty).catch((e) => console.log(e));
                    if (this.client.party?.me?.isReady) {
                        this.client.party.me.setReadiness(false).catch((e) => console.log(e));
                    }
                    if (this.timerStatus) {
                        this.timerStatus = false;
                        clearTimeout(this.timerId);
                        console.log("[PARTY] Time has stopped!");
                    }
                    break;
                case 2:
                case 3:
                case 4:
                    this.client?.party?.chat.send(
                        `${config.fortnite.join_message}\n Bot By Ryuk`
                    ).catch((e) => console.log(e));
                    this.client.setStatus(
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
            try { await this.client?.party?.leave(); } catch (error) { console.error(error); } // prettier-ignore
        }
    }

    private async handlePartyMemberLeft(left: PartyMember) {
        console.log(`member left: ${left.displayName}`);
        const party = this.client.party;

        if (config.logs.enable_logs) {
            discordlog(
                "[Logs] Party Members:",
                `**${left.displayName}** has left.`,
                0xffa500
            );
        }
        if (!party) {
            console.warn("No party instance available.");
            return;
        }

        await party.fetch();
        const partySize = party.size;
        switch (partySize) {
            case 1:
                this.client.setStatus(
                    config.fortnite.invite_status,
                    config.fortnite.invite_onlinetype
                );
                await party.setPrivacy(PrivateParty).catch((e) => console.log(e));

                if (party.me?.isReady) {
                    party.me.setReadiness(false).catch((e) => console.log(e));;
                }

                if (this.timerStatus) {
                    this.timerStatus = false;
                    clearTimeout(this.timerId);
                    console.log("[PARTY] Time has stopped!");
                }
                break;

            case 2:
            case 3:
            case 4:
                party.chat.send(`${config.fortnite.join_message}\n Bot By Ryuk`).catch((e) => console.log(e));
                this.client.setStatus(
                    config.fortnite.inuse_status,
                    config.fortnite.inuse_onlinetype
                );
                break;

            default:
                console.warn(`Unexpected party size: ${partySize}`);
                break;
        }
    }

    private handleAxiosError(error: AxiosError) {
        if (error.response) {
            const data = error?.response?.data as AxiosErrorResponseData;
            if (data.errorCode && this.client && this.client.party) {
                this.client.party.sendMessage(
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
    }
}

(async () => {
    // testing multi bots in one instance
    const app: Express = ExpressApp;
    const deviceauths: { accountId: string; deviceId: string; secret: string }[] = [
        {
            accountId: "",
            deviceId: "",
            secret: "",
        },
        {
            accountId: "",
            deviceId: "",
            secret: "",
        },
    ];

    const bots = deviceauths.map((auth) => new FortniteBot(auth));

    for (const bot of bots) {
        await bot.initialize();
    }
})();
