# Configuration File Guide

### Rename config.samle.json to config.json and fill in the required fields.
## Configuration Sections

### 1. `fortnite`

- **`cid`**:
  - **Description**: Character ID for the Fortnite character.
  - **Format**: String
  - **Example**: `"CID_416_Athena_Commando_M_AssassinSuit"`

- **`bid`**:
  - **Description**: Back Bling ID associated with the character.
  - **Format**: String
  - **Example**: `"BID_244_DarkVikingFire"`

- **`eid`**:
  - **Description**: Emote ID if you want to include an emote. Leave empty if not used.
  - **Format**: String (optional)
  - **Example**: `"EID_123_FancyDance"`

- **`level`**:
  - **Description**: The level of the battle pass.
  - **Format**: Number (as a string)
  - **Example**: `69`

- **`battle_pass_owned`**:
  - **Description**: Whether the battle pass is owned.
  - **Format**: Boolean (`true` or `false`)
  - **Example**: `true`

- **`battle_pass_lvl`**:
  - **Description**: Current level of the battle pass.
  - **Format**: Number (as a string)
  - **Example**: `1`

- **`banner`**:
  - **Description**: Banner ID for the Fortnite banner. Leave empty if not used.
  - **Format**: String (optional)
  - **Example**: `"BANNER_001_DefaultBanner"`

- **`add_users`**:
  - **Description**: Whether to automatically add users.
  - **Format**: Boolean (`true` or `false`)
  - **Example**: `true`

- **`leave_time`**:
  - **Description**: Time in milliseconds before the bot leaves.
  - **Format**: Number
  - **Example**: `90000` (for 90 seconds)

- **`join_message`**:
  - **Description**: Message sent when a user joins.
  - **Format**: String
  - **Example**: `"Welcome to Ryuk's Bot Lobby 🔥"`

- **`invite_status`**:
  - **Description**: Status message shown when inviting.
  - **Format**: String
  - **Example**: `"Ryuk's Bot | Invite ✔️"`

- **`invite_onlinetype`**:
  - **Description**: Type of presence to show when inviting.
  - **Format**: String (e.g., `online`, `dnd`, `away`)
  - **Example**: `"online"`

- **`inuse_status`**:
  - **Description**: Status message shown when the bot is in use.
  - **Format**: String
  - **Example**: `"🚫Bot is In-Use!🚫"`

- **`inuse_onlinetype`**:
  - **Description**: Type of presence to show when in use.
  - **Format**: String (e.g., `online`, `dnd`, `away`)
  - **Example**: `"online"`

- **`owner_epicid`**:
  - **Description**: Unique identifier for the bot owner in Epic Games.
  - **Format**: String
  - **Example**: `"a3f5b6d7e8c90f1b23456789ab0cdeff"`

- **`leave_party`**:
  - **Description**: Whether or not to leave the party after the bot completes matchmaking
  - **Format**: Boolean
  - **Example**: `"true"`

### 2. `logs`

- **`enable_logs`**:
  - **Description**: Whether to enable logging.
  - **Format**: Boolean (`true` or `false`)
  - **Example**: `true`

- **`channel`**:
  - **Description**: ID of the Discord channel where logs will be sent.
  - **Format**: String
  - **Example**: `"123456789123456"`

- **`name`**:
  - **Description**: Name to use for logs.
  - **Format**: String
  - **Example**: `"**Ryuk**'s Bot"`

### 3. `discord`

- **`run_discord_client`**:
  - **Description**: Whether to run the Discord client.
  - **Format**: Boolean (`true` or `false`)
  - **Example**: `true`

- **`guild_slash_status_response`**:
  - **Description**: Response message for guild slash commands.
  - **Format**: String
  - **Example**: `"Ryuk's FN Bot is currently online!"`

- **`command_guild`**:
  - **Description**: ID of the Discord guild where commands are registered.
  - **Format**: String
  - **Example**: `"123123123123123123"`

- **`status`**:
  - **Description**: Status message shown for the bot on Discord.
  - **Format**: String
  - **Example**: `"Fortnite"`

- **`status_type`**:
  - **Description**: Type of presence shown (e.g., 0 = "Playing", 1 = "Streaming", 2 = "Listening", 3 = "Watching", 4 = "Custom", 5 = Competing).
  - **Format**: Number
  - **Example**: `0`

### 4. `system`

- **`bot_owner_name`**:
  - **Description**: Bot owner name/username.
  - **Format**: String
  - **Example**: `"Ryuk"`

- **`bot_loading_message`**:
  - **Description**: Message shown while the bot is loading.
  - **Format**: String
  - **Example**: `"Bot is loading!"`

- **`web_message`**:
  - **Description**: Message or URL used for uptime monitoring.
  - **Format**: String
  - **Example**: `"Check uptime here: http://example.com/uptime"`

- **`version`**:
  - **Description**: The version of the bot.
  - **Format**: String
  - **Example**: `"8.2.0"`

## Notes

- Ensure all strings are enclosed in double quotes.
- Replace placeholder values with actual data relevant to your configuration.
- Boolean values must be `true` or `false` (not in quotes).
- Numeric values should be in quotes if specified as strings.

