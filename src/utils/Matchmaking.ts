import axios, { AxiosResponse } from "axios";
import WebSocket from "ws";
import { IncomingMessage, ClientRequest } from "http";
import { calcChecksum, discordlog } from "./Helpers.js";
import xmlparser from "xml-parser";
import { config, AuthSessionStoreKey } from "./Config.js";
import { websocketHeaders } from "./constants.js";
import Endpoints from "./Endpoints.js";
import type { Client, PartyMember, ClientParty } from "fnbr";
import { allowedPlaylists } from "./constants.js";
import type {
  MMSTicket,
  TicketResponse,
  PartyMatchmakingInfo,
} from "./types.js";

export async function getMMTicket(
  token: string | undefined,
  userId: string | undefined,
  query: URLSearchParams
): Promise<TicketResponse> {
  try {
    const response: AxiosResponse = await axios.get(
      `${Endpoints.MATCHMAKING}${userId}?${query}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      TicketData: response.data,
      TicketStatus: response.status,
    };
  } catch (error: any) {
    console.error("Error fetching ticket:", error);
    throw new Error("Failed to fetch ticket");
  }
}

export async function startMatchmaking(
  client: Client,
  updatedParty: ClientParty,
  bLog: Boolean,
  bIsMatchmaking: Boolean
) {
  try {
    const PartyMatchmakingInfo: PartyMatchmakingInfo = JSON.parse(
      updatedParty.meta.schema["Default:PartyMatchmakingInfo_j"] ?? ""
    ).PartyMatchmakingInfo;

    const playlistId = PartyMatchmakingInfo.playlistName.toLocaleLowerCase();

    if (!allowedPlaylists.includes(playlistId)) {
      console.log("Unsupported playlist", playlistId);
      client?.party?.chat.send(
        `Playlist id: ${playlistId} is not a supported gamemode!`
      ).catch((e) => console.log(e));
      client?.party?.me.setReadiness(false);
      return;
    }
    const partyPlayerIds = client?.party?.members
      .filter((x: any) => x.isReady)
      .map((x: any) => x.id)
      .join(",");

    const bucketId = `${PartyMatchmakingInfo.buildId}:${PartyMatchmakingInfo.playlistRevision}:${PartyMatchmakingInfo.regionId}:${playlistId}`;
    console.log(bucketId);
    if (config.logs.enable_logs === true) {
      console.log("[Logs] New BucketId:", `**${bucketId}**`)
      discordlog("[Logs] New BucketId:", `**${bucketId}**`, 0x00ffff);
    } else return;

    console.log(partyPlayerIds);

    const query = new URLSearchParams();
    // credits: Updated by AjaxFNC-YT
    query.append("partyPlayerIds", partyPlayerIds ?? "");
    query.append("player.platform", "Windows");
    query.append("player.option.linkCode", playlistId.toString());
    query.append(
      "player.option.partyId",
      client.party?.id ? client.party?.id : ""
    );
    query.append("input.KBM", "true");
    query.append("player.input", "KBM");
    query.append("bucketId", bucketId);
    query.append("player.option.preserveSquad", "false");
    query.append("player.option.crossplayOptOut", "false");
    query.append("player.option.splitScreen", "false");
    query.append("party.WIN", "true");
    query.append("player.option.microphoneEnabled", "false");
    query.append("player.option.uiLanguage", "en");

    client?.party?.members
      .filter((x: PartyMember) => x.isReady)
      .forEach((Member: PartyMember) => {
        const platform = Member.meta.get("Default:PlatformData_j");
        if (!query.has(`party.${platform?.PlatformName}`)) {
          query.append(`party.${platform?.PlatformName}`, "true");
        }
      });

    const token = client?.auth?.sessions?.get(
      AuthSessionStoreKey.Fortnite
    )?.accessToken;
    const { TicketData, TicketStatus } = await getMMTicket(
      token,
      client?.user?.self?.id,
      query
    );

    if (TicketStatus !== 200) {
      console.log(`[Matchmaking] Error while obtaining ticket`);
      client?.party?.me.setReadiness(false);
      return;
    }

    const ticket: MMSTicket = TicketData;
    const payload = ticket.payload;
    const signature = ticket.signature;

    // Calculate checksum
    const hash = await calcChecksum(payload, signature);

    console.log(ticket.payload, ticket.signature, hash);

    const MMSAuth = [
      "Epic-Signed",
      ticket.ticketType,
      payload,
      signature,
      hash,
    ];

    const matchmakingClient = new WebSocket(ticket.serviceUrl, {
      perMessageDeflate: false,
      rejectUnauthorized: false,
      headers: {
        Origin: ticket.serviceUrl.replace("ws", "http"),
        Authorization: MMSAuth.join(" "),
        ...websocketHeaders,
      },
    });

    matchmakingClient.on(
      "unexpected-response",
      (request: ClientRequest, response: IncomingMessage) => {
        let data = "";
        response.on("data", (chunk) => (data += chunk));

        response.on("end", () => {
          const baseMessage = `[MATCHMAKING] Error while connecting to matchmaking service: (status ${response.statusCode} ${response.statusMessage})`;

          client?.party?.chat.send(
            `Error while connecting to matchmaking service: (status ${response.statusCode} ${response.statusMessage})`
          ).catch((e) => console.log(e));

          const contentType = response.headers["content-type"] ?? "error";

          if (data === "") {
            console.error(baseMessage);
            if (config.logs.enable_logs === true) {
              discordlog("[Logs] Error", baseMessage, 0x880808);
            } else return;
          } else if (contentType.startsWith("application/json")) {
            const jsonData = JSON.parse(data);

            if (jsonData.errorCode) {
              console.error(
                `${baseMessage}, ${jsonData.errorCode} ${jsonData.errorMessage || ""
                }`
              );
              client?.party?.chat.send(
                `Error while connecting to matchmaking service: ${jsonData.errorCode
                } ${jsonData.errorMessage || ""}`
              ).catch((e) => console.log(e));
            } else {
              console.error(`${baseMessage} response body: ${data}`);
            }
          } else if (response.headers["x-epic-error-name"]) {
            console.error(
              `${baseMessage}, ${response.headers["x-epic-error-name"]} response body: ${data}`
            );
          } else if (contentType.startsWith("text/html")) {
            const parsed = xmlparser(data);

            if (parsed.root) {
              try {
                const head = parsed.root.children?.find(
                  (x: any) => x.name === "head"
                );
                const titleElement = head?.children?.find(
                  (x: any) => x.name === "title"
                );
                const title = titleElement
                  ? titleElement.children[0].content
                  : "No title found";

                console.error(`${baseMessage} HTML title: ${title}`);
              } catch (error) {
                console.error(`${baseMessage} HTML response body: ${data}`);
              }
            } else {
              console.error(`${baseMessage} HTML response body: ${data}`);
            }
          } else {
            console.error(`${baseMessage} response body: ${data}`);
          }
        });
      }
    );

    if (bLog) {
      matchmakingClient.on("close", () => {
        console.log(`[Matchmaking] Connection to the matchmaker closed`);
        if (config.logs.enable_logs === true) {
          discordlog("[Logs] Matchmaking", "Matchmaking closed", 0xffa500);
        }
      });
    }

    matchmakingClient.on("error", (err: string) => {
      bIsMatchmaking = false;
      console.log(`[Matchmaking] Error: ${err}`);
    })

    matchmakingClient.on("message", (msg: string) => {
      const message = JSON.parse(msg);
      if (bLog) {
        console.log(`[Matchmaking] Message from the matchmaker`, message);
      }

      if (message.name?.toLowerCase().includes("error")) {
        bIsMatchmaking = false;
      }
    });
  } catch (error) {
    bIsMatchmaking = false;
    console.error(`Error in matchmaking handling: ${error}`);
  }
}
