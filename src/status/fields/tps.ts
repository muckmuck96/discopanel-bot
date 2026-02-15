import { registerField } from '../fieldRegistry.js';
import { formatTps } from '../../utils/embeds.js';

registerField({
  id: 'tps',
  label: 'TPS',
  emoji: '',
  inline: true,
  extract: (server) => {
    if (server.status !== 'running') {
      return null;
    }
    return formatTps(server.tps);
  },
  defaultEnabled: true,
});
