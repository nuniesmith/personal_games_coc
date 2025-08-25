# Feast <img src="https://avatars.githubusercontent.com/u/163577176?s=200&v=4" width="50" height="50" align="center" alt="Logo">

A Clash of Clans Discord bot focused on efficient clan management. It provides role automation, player stats, leaderboards, and war tracking, allowing you to handle clan operations directly from your Discord server.

<div align="center">
  
[![Contributors](https://img.shields.io/github/contributors/ClashKingInc/ClashKingBot?style=for-the-badge)](https://github.com/ClashKingInc/ClashKingBot/graphs/contributors)
[![Forks](https://img.shields.io/github/forks/ClashKingInc/ClashKingBot?style=for-the-badge)](https://github.com/ClashKingInc/ClashKingBot/network/members)
[![Stargazers](https://img.shields.io/github/stars/ClashKingInc/ClashKingBot?style=for-the-badge)](https://github.com/ClashKingInc/ClashKingBot/stargazers)
[![Issues](https://img.shields.io/github/issues/ClashKingInc/ClashKingBot?style=for-the-badge)](https://github.com/ClashKingInc/ClashKingBot/issues)
[![MIT License](https://img.shields.io/github/license/ClashKingInc/ClashKingBot?style=for-the-badge)](https://github.com/ClashKingInc/ClashKingBot/blob/master/LICENSE)

[**Invite Bot**](https://discord.com/application-directory/824653933347209227) • [**Docs**](https://docs.feast.xyz) • [**Demo (Discord)**](https://discord.gg/feast)

</div>

---

## 🚀 Quick Navigation  
- [Overview](#overview)  
- [Features](#features)  
- [Tech Stack](#tech-stack)  
- [Sister Repositories](#sister-repositories)  
- [Getting Started](#getting-started)  
- [Docker Image](#docker-image)  
- [Contributing](#contributing)  
- [License](#license)  
- [Contact](#contact)  

<p align="right"><a href="#top">Back to Top ↑</a></p>

---

## Overview

Feast integrates with your Clash of Clans clan to manage roles, verify players, track performance, and keep everyone updated with reminders and notifications. It’s designed to streamline day-to-day clan operations on Discord.

<p align="right"><a href="#top">Back to Top ↑</a></p>

---

## Features

- **Role Automation:**  
  Verify players and assign appropriate roles automatically.
  
- **Player Statistics:**  
  Access detailed stats, including progress and recent activity.

- **Leaderboards:**  
  Generate leaderboards to compare player performance.

- **War Tracking:**  
  Monitor war attacks, defenses, and final results.

- **Reminders & Alerts:**  
  Set notifications for Clan Games, war starts, and other key events.

Have an idea for improvement? [Request it here](https://github.com/ClashKingInc/ClashKingBot/issues).

<p align="right"><a href="#top">Back to Top ↑</a></p>

---

## Tech Stack

**Languages & Frameworks:**
- [Python 3.12](https://www.python.org/)  
- [disnake](https://docs.disnake.dev/en/stable/index.html)  
- [coc.py](https://cocpy.readthedocs.io/en/latest/)  

**Databases & Caching:**
- [MongoDB](https://motor.readthedocs.io/en/stable/tutorial-asyncio.html)  
- [Redis](https://redis.io/)

Additional dependencies can be found in [requirements.txt](https://github.com/ClashKingInc/ClashKingBot/blob/master/requirements.txt).

<p align="right"><a href="#top">Back to Top ↑</a></p>

---

## Sister Repositories

- [Feast API](https://github.com/ClashKingInc/ClashKingAPI)  
- [Feast Tracking](https://github.com/ClashKingInc/ClashKingTracking)  
- [Feast Docs](https://github.com/ClashKingInc/ClashKingDocs)

<p align="right"><a href="#top">Back to Top ↑</a></p>

---

## Getting Started

1. [Invite ClashKingBot](https://discord.com/application-directory/824653933347209227) to your server.
2. Review the [Quick Start Guide](https://docs.feast.xyz/quick-start) for initial setup.
3. Adjust settings and commands as needed.

### Environment Variables (War Automation Additions)

Add the following to your environment to enable war prep auto-posting:

`WAR_PREP_AUTOPOST_CHANNEL_IDS` – Comma-separated Discord channel IDs that will receive periodic prep stat + assignment snapshot embeds during the war preparation phase. Leave blank to disable. Example:

```
WAR_PREP_AUTOPOST_CHANNEL_IDS=123456789012345678,234567890123456789
```

Optional persistence:

`WAR_PREP_DEDUP_CACHE_FILE` – Path to a JSON file used to persist the last posted snapshot signature per clan (prevents duplicate auto-posts after restarts). Example:

```
WAR_PREP_DEDUP_CACHE_FILE=./data/war_prep_dedup.json
```

Metrics (optional):

`BOT_ENABLE_METRICS` – When set to `1` (default), starts a lightweight FastAPI + Prometheus metrics server on port `9310` exposing `/metrics` and `/health`. Set to `0` to disable in minimal or resource constrained deployments.

<p align="right"><a href="#top">Back to Top ↑</a></p>

---

## Docker Image

The Docker image for this bot is available on GitHub Container Registry (GHCR):

```bash
docker pull ghcr.io/feastinc/feastbot:latest
