import { registerField } from '../fieldRegistry.js';

registerField({
  id: 'version',
  label: 'Minecraft Version',
  emoji: '🎮',
  inline: true,
  extract: (server) => {
    const parts: string[] = [];

    if (server.mcVersion) {
      parts.push(server.mcVersion);
    }

    if (server.modLoader && server.modLoader.toLowerCase() !== 'vanilla') {
      parts.push(`(${server.modLoader})`);
    }

    return parts.length > 0 ? parts.join(' ') : null;
  },
  defaultEnabled: true,
});
