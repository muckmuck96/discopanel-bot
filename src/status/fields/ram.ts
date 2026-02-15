import { registerField } from '../fieldRegistry.js';
import { formatMemory } from '../../utils/embeds.js';

registerField({
  id: 'ram',
  label: 'RAM Usage',
  emoji: '🧠',
  inline: true,
  extract: (server) => {
    if (server.status !== 'running') {
      return null;
    }
    return formatMemory(server.memoryUsage);
  },
  defaultEnabled: true,
});
