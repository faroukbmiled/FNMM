import axios, { AxiosResponse } from "axios";
import WebSocket from "ws";
import { IncomingMessage, ClientRequest } from "http";
import { calcChecksum, discordlog } from "./Helpers.js";
import xmlparser from "xml-parser";
import { Client } from "fnbr";
import { config, AuthSessionStoreKey } from "./Config.js";
import { websocketHeaders } from "./constants.js";
import Endpoints from "./Endpoints.js";
import type { MMSTicket, TicketResponse } from "./types.js";

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
  query: URLSearchParams,
  bLog: Boolean,
  bIsMatchmaking: Boolean
) {
  try {
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
          );

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
                `${baseMessage}, ${jsonData.errorCode} ${
                  jsonData.errorMessage || ""
                }`
              );
              client?.party?.chat.send(
                `Error while connecting to matchmaking service: ${
                  jsonData.errorCode
                } ${jsonData.errorMessage || ""}`
              );
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

    matchmakingClient.on("message", (msg: string) => {
      const message = JSON.parse(msg);
      if (bLog) {
        console.log(`[Matchmaking] Message from the matchmaker`, message);
      }

      if (message.name === "Error") {
        bIsMatchmaking = false;
      }
    });
  } catch (error) {
    console.error(`Error in matchmaking handling: ${error}`);
  }
}
