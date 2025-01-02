# Environment Variables Configuration

This document provides instructions on how to set up the environment variables required for the application.

---

### Required Environment Variables

Below are the required environment variables and how to configure them:

- **`DISCORD_TOKEN`**: The token for the Discord bot.
  - **Example bash command**:
    ```bash
    export DISCORD_TOKEN="MZ1yGvKTjE0rY0cV8i47CjAa.uRHQPq.Xb1Mk2nEhe-4iUcrGOuegj57zMC"
    ```

- **`DISCORD_BOT_OWNER`**: The Discord user ID of the bot owner.
  - **Example bash command**:
    ```bash
    export DISCORD_BOT_OWNER="123123123123123123"
    ```

- **`accountId`**: The account ID for Fortnite.
  - **Example bash command**:
    ```bash
    export accountId="8a1b2c3d4e5f67890abcdeff01234567"
    ```

- **`deviceId`**: The device ID for Fortnite authentication.
  - **Example bash command**:
    ```bash
    export deviceId="a3f5b6d7e8c90f1b23456789ab0cdeff"
    ```

- **`secret`**: The secret key for Fortnite authentication.
  - **Example bash command**:
    ```bash
    export secret="P9W3R7K2L1V0XJ6YQF8ZB5CGD4HTN0A"
    ```

---

### 1 - Using `.env` File (Recommended)

Create a `.env` file in the root folder of the project and define the variables there. This method is convenient and helps keep sensitive information secure.

##### Example `.env` File:
```env
DISCORD_TOKEN=MZ1yGvKTjE0rY0cV8i47CjAa.uRHQPq.Xb1Mk2nEhe-4iUcrGOuegj57zMC
DISCORD_BOT_OWNER=123123123123123123
accountId=8a1b2c3d4e5f67890abcdeff01234567
deviceId=a3f5b6d7e8c90f1b23456789ab0cdeff
secret=P9W3R7K2L1V0XJ6YQF8ZB5CGD4HTN0A
```

### 2 - Setting Environment Variables Manually

To set these environment variables, you can add the export commands to your shell configuration file (e.g., `.bashrc`, `.bash_profile`, `.zshrc`), or you can set them directly in your terminal session.

#### Adding to Shell Configuration File

1. Open your shell configuration file in a text editor. For example:
   ```bash
   nano ~/.bashrc
2. Add the export commands for the required environment variables. For example:
   ```bash
    export DISCORD_TOKEN="your-discord-token"
    export DISCORD_BOT_OWNER="your-discord-bot-owner-id"
    export accountId="your-account-id"
    export deviceId="your-device-id"
    export secret="your-secret-key"```
3. Save and close the file.
4. Restart your terminal or run this command ```source ~/.bashrc```

#### ** these are example tokens