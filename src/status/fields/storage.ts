import { registerField } from '../fieldRegistry.js';
import { formatStorage } from '../../utils/embeds.js';

registerField({
  id: 'storage',
  label: 'Storage',
  emoji: '',
  inline: true,
  extract: (server) => {
    return formatStorage(server.diskUsage, server.diskTotal);
  },
  defaultEnabled: true,
});
