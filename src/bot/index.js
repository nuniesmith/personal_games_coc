/* Discord Bot bridging internal COC API endpoints */
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const http = require('http');
const axios = require('axios');

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID; // Application (bot) client ID
const API_URL = process.env.API_URL || 'http://coc-api:3001';
const SERVICE_BOT_TOKEN = process.env.SERVICE_BOT_TOKEN; // Shared internal token to bypass auth middleware
const GUILD_ID = process.env.DEV_GUILD_ID; // Optional: restrict to one guild for faster command deploy while testing

if (!DISCORD_TOKEN) {
  console.error('DISCORD_BOT_TOKEN not set. Exiting.');
  process.exit(1);
}
if (!CLIENT_ID) {
  console.error('DISCORD_CLIENT_ID not set. Exiting.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
let readyAt = null;

// Slash command definitions
const commands = [
  new SlashCommandBuilder()
    .setName('clan-stats')
    .setDescription('Get Feast or Famine clan metrics'),
  new SlashCommandBuilder()
    .setName('war-log')
    .setDescription('Get recent war log entries (latest first)')
    .addIntegerOption(o => o.setName('limit').setDescription('Number of entries (1-20)').setMinValue(1).setMaxValue(20)),
  new SlashCommandBuilder()
    .setName('member-stats')
    .setDescription('Get stats for a clan member')
    .addStringOption(o => o.setName('player_tag').setDescription('Player tag (e.g. #ABC123)').setRequired(true)),
  new SlashCommandBuilder()
    .setName('current-war')
    .setDescription('Get current war status'),
  new SlashCommandBuilder()
    .setName('war-push')
    .setDescription('Force push current war summary to Discord webhook'),
  new SlashCommandBuilder()
    .setName('layout-share')
    .setDescription('Share a saved base layout by ID')
    .addStringOption(o=> o.setName('layout_id').setDescription('Layout ID').setRequired(true)),
];

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  try {
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands.map(c => c.toJSON()) });
      console.log('Guild slash commands registered (fast deploy).');
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands.map(c => c.toJSON()) });
      console.log('Global slash commands registered (may take up to an hour to propagate).');
    }
  } catch (err) {
    console.error('Error registering slash commands', err); 
  }
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  readyAt = new Date();
  registerCommands();
});

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: SERVICE_BOT_TOKEN ? { 'x-service-token': SERVICE_BOT_TOKEN } : {}
});

function formatClanEmbed(data) {
  return new EmbedBuilder()
    .setTitle(`${data.name} (${data.tag})`)
    .setDescription(data.description || 'No description.')
    .setColor(0x00a3ff)
    .addFields(
      { name: 'Level', value: String(data.clanLevel), inline: true },
      { name: 'Members', value: String(data.members), inline: true },
      { name: 'Points', value: String(data.clanPoints ?? 'N/A'), inline: true },
      { name: 'War Wins', value: String(data.warWins ?? 'N/A'), inline: true },
    );
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  await interaction.deferReply();
  try {
    if (interaction.commandName === 'clan-stats') {
      const res = await api.get('/api/coc/clan');
      if (!res.data.success) throw new Error('API returned error');
      const embed = formatClanEmbed(res.data.data);
      await interaction.editReply({ embeds: [embed] });
    } else if (interaction.commandName === 'war-log') {
      const limit = interaction.options.getInteger('limit') || 5;
      const res = await api.get('/api/coc/clan/warlog', { params: { limit } });
      if (!res.data.success) throw new Error('API returned error');
      const items = res.data.data?.items || [];
      if (!items.length) return interaction.editReply('No war log entries.');
      const lines = items.slice(0, limit).map(w => {
        const opponent = w.opponent?.name || 'Unknown';
        const result = w.result || 'unknown';
        return `vs ${opponent}: ${result}`;
      }).join('\n');
      await interaction.editReply(lines);
    } else if (interaction.commandName === 'member-stats') {
      let tag = interaction.options.getString('player_tag');
      if (!tag.startsWith('#')) tag = `#${tag}`;
      const encoded = encodeURIComponent(tag);
      const res = await api.get(`/api/coc/player/${encoded}`);
      if (!res.data.success) throw new Error('API returned error');
      const p = res.data.data;
      const embed = new EmbedBuilder()
        .setTitle(`${p.name} (${p.tag})`)
        .setColor(0x2ecc71)
        .addFields(
          { name: 'TH', value: String(p.townHallLevel ?? 'N/A'), inline: true },
          { name: 'Role', value: String(p.role ?? 'N/A'), inline: true },
          { name: 'Trophies', value: String(p.trophies ?? 'N/A'), inline: true }
        );
      await interaction.editReply({ embeds: [embed] });
    } else if (interaction.commandName === 'current-war') {
      const res = await api.get('/api/coc/clan/currentwar');
      if (!res.data.success) throw new Error('API returned error');
      const war = res.data.data;
      if (war.state === 'notInWar') return interaction.editReply('Clan is not currently in war.');
      const embed = new EmbedBuilder()
        .setTitle('Current War')
        .setColor(0xffa500)
        .addFields(
          { name: 'State', value: String(war.state), inline: true },
          { name: 'Team Size', value: String(war.teamSize ?? 'N/A'), inline: true },
          { name: 'Attacks Per Member', value: String(war.attacksPerMember ?? '2'), inline: true }
        );
      await interaction.editReply({ embeds: [embed] });
    } else if (interaction.commandName === 'war-push') {
      // Force push via internal service route
      const res = await api.post('/api/coc/war/push', { clanTag: process.env.COC_CLAN_TAG });
      if (res.data?.success) await interaction.editReply('War update pushed.'); else await interaction.editReply(res.data?.error || 'Failed to push war update.');
    } else if (interaction.commandName === 'layout-share') {
      const id = interaction.options.getString('layout_id');
      try {
        const res = await api.post(`/api/coc/base/layouts/${id}/share`);
        if (res.data?.success) await interaction.editReply(`Layout ${id} shared.`); else await interaction.editReply(res.data?.error || 'Share failed.');
      } catch (e) {
        await interaction.editReply('Share failed.');
      }
    }
  } catch (err) {
    console.error('Command error', err?.response?.data || err.message);
    const msg = err.response?.status === 401 ? 'Auth failure querying API' : 'Error fetching data.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(msg);
    } else {
      await interaction.reply(msg);
    }
  }
});

client.login(DISCORD_TOKEN);

// Minimal HTTP server for Docker healthcheck
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    const healthy = !!client.user;
    res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: healthy ? 'ok' : 'starting', readyAt }));
  }
  res.writeHead(404);
  res.end();
});
healthServer.listen(3002, () => console.log('Bot health endpoint on :3002/health'));
