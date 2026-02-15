import { registerField } from '../fieldRegistry.js';
import { formatPlayers } from '../../utils/embeds.js';

registerField({
  id: 'players',
  label: 'Player Count',
  emoji: '👥',
  inline: true,
  extract: (server) => {
    if (server.status !== 'running') {
      return null;
    }
    return formatPlayers(server.playersOnline, server.playersMax);
  },
  defaultEnabled: true,
});
