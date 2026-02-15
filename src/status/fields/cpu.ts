import { registerField } from '../fieldRegistry.js';
import { formatCpu } from '../../utils/embeds.js';

registerField({
  id: 'cpu',
  label: 'CPU Usage',
  emoji: '💻',
  inline: true,
  extract: (server) => {
    if (server.status !== 'running') {
      return null;
    }
    return formatCpu(server.cpuUsage);
  },
  defaultEnabled: true,
});
