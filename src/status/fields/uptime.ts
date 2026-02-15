import { registerField } from '../fieldRegistry.js';
import { formatUptime } from '../../utils/embeds.js';

registerField({
  id: 'uptime',
  label: 'Uptime',
  emoji: '⏱️',
  inline: true,
  extract: (server) => {
    if (server.status !== 'running' || server.uptime === null) {
      return null;
    }
    return formatUptime(server.uptime);
  },
  defaultEnabled: true,
});
