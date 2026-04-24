require("dotenv").config();
const { Client, Collection, GatewayIntentBits, REST, Routes, Partials } = require("discord.js");
const fs = require("fs");
const mongoose = require("mongoose");

const {
  token,
  mongodb,
  guildId: envGuildId,
  applicationId: envApplicationId,
  botId: envBotId,
} = process.env;

if (!token) {
  throw new Error("Missing required environment variable: token");
}

if (!mongodb) {
  throw new Error("Missing required environment variable: mongodb");
}

if (!envBotId) {
  throw new Error("Missing required environment variable: botId");
}

if (!envApplicationId) {
  throw new Error("Missing required environment variable: applicationId");
}

if (!envGuildId) {
  throw new Error("Missing required environment variable: guildId");
}

mongoose.connect(mongodb)
  .then(() => console.log("Connected to MongoDB successfully!"))
  .catch((err) => console.error("MongoDB connection error:", err));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
client.commandArray = [];

const handleEvents = async () => {
  const eventFiles = fs.readdirSync("./events").filter((file) => file.endsWith(".js"));
  for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
    else client.on(event.name, (...args) => event.execute(...args, client));
  }
};

const handleCommands = async () => {
  const commandFiles = fs.readdirSync("./commands/slash").filter((file) => file.endsWith(".js"));
  console.log("Loading slash commands...");
  for (const file of commandFiles) {
    const command = require(`./commands/slash/${file}`);
    if (!command.data || !command.data.name) continue;
    client.commands.set(command.data.name, command);
    client.commandArray.push(command.data.toJSON());
    console.log(`Loaded command: ${command.data.name}`);
  }

  const clientId = client.application?.id || client.user?.id;
  const loggedInBotId = client.user?.id;
  const guildId = envGuildId;
  const rest = new REST({ version: "10" }).setToken(token);

  if (!clientId) {
    console.error("Skipping slash command upload because the application ID is not available yet.");
    return;
  }

  if (envApplicationId !== clientId) {
    throw new Error(`Logged-in application ID (${clientId}) does not match expected applicationId (${envApplicationId}).`);
  }

  if (envBotId !== loggedInBotId) {
    throw new Error(`Logged-in bot user ID (${loggedInBotId}) does not match expected botId (${envBotId}).`);
  }

  try {
    console.log(`Uploading slash commands to guild ${guildId} for application ${clientId} as ${client.user?.tag || "unknown bot"}...`);
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: client.commandArray,
    });
    console.log("Slash commands uploaded successfully.");
    console.log("Available commands:");
    client.commands.forEach((cmd, name) => {
      console.log(`- ${name}`);
    });
  } catch (error) {
    console.error("Error uploading slash commands:", error.stack);
  }
};

client.handleEvents = handleEvents;
client.handleCommands = handleCommands;

(async () => {
  await client.handleEvents();
  await client.login(token);
  console.log(`Logged in as ${client.user.tag} (${client.user.id})`);
  console.log(`Discord application ID: ${client.application?.id || "unknown"}`);
  if (client.user.id !== envBotId) {
    throw new Error(`Refusing to continue because logged-in bot user ID (${client.user.id}) does not match expected botId (${envBotId}).`);
  }
  if ((client.application?.id || client.user.id) !== envApplicationId) {
    throw new Error(`Refusing to continue because logged-in application ID (${client.application?.id || client.user.id}) does not match expected applicationId (${envApplicationId}).`);
  }
  await client.handleCommands();
})();
