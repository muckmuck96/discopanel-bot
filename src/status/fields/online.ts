import { registerField } from '../fieldRegistry.js';
import { getStatusIcon } from '../../utils/embeds.js';

registerField({
  id: 'online',
  label: 'Online Status',
  emoji: '',
  inline: true,
  extract: (server) => {
    const icon = getStatusIcon(server.status);
    const status = server.status.charAt(0).toUpperCase() + server.status.slice(1);
    return `${icon} ${status}`;
  },
  defaultEnabled: true,
});
