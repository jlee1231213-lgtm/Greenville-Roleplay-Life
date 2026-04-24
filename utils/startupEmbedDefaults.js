const STARTUP_EMBED_DEFAULTS = {
  title: ':blue_butterflies: Greenville Life Roleplay - Session Startup :blue_butterflies:',
  description: [
    '[User] is planning to host a Greenville Roleplay! If your interested in joining this Roleplay please react with the assigned reaction below! If you react and do not join, you will be faced against moderation. Any external reactions will be moderated by our staff team! Before joining this session! Ensure if you react to join!',
    '',
    '',
    '<:blue_arrow:1489774422767439924> Ensure you have checked over <#1462963347971375165>',
    '',
    "<:blue_arrow:1489774422767439924> Ensure you've registered your car in <#1484318355107090494> before the session starts.",
    '',
    '',
    '>  In order to start this message needs to hit **[reactions]+** Reactions.'
  ].join('\n'),
  image: 'https://media.discordapp.net/attachments/1471648998266769468/1490181610807759059/image-30.png?ex=69ecd486&is=69eb8306&hm=2143047cf25b94ed79386da2dac6ec7af3b81f2e4fd6d5766325be2579333aa5&=&format=webp&quality=lossless&width=1488&height=872'
};

const LEGACY_STARTUP_DESCRIPTIONS = new Set([
  'React with \u2705 to join the session!'
]);

function getStartupEmbedTemplate(settings) {
  const current = settings?.startupEmbed || {};
  const isLegacy =
    current.title === 'Startup Session Started by $user' ||
    LEGACY_STARTUP_DESCRIPTIONS.has(current.description);

  if (isLegacy) return STARTUP_EMBED_DEFAULTS;

  return {
    title: current.title || STARTUP_EMBED_DEFAULTS.title,
    description: current.description || STARTUP_EMBED_DEFAULTS.description,
    image: current.image || STARTUP_EMBED_DEFAULTS.image
  };
}

module.exports = {
  STARTUP_EMBED_DEFAULTS,
  getStartupEmbedTemplate
};
