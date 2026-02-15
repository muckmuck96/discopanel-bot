import { connectAdapter } from './connect.js';
import { restAdapter } from './rest.js';
import type { PanelAdapter, AuthResult } from '../types.js';
import type { ApiStyle } from '../../types.js';

export function getAdapter(apiStyle: ApiStyle): PanelAdapter {
  switch (apiStyle) {
    case 'connect':
      return connectAdapter;
    case 'rest':
      return restAdapter;
    default:
      return connectAdapter;
  }
}

export async function detectApiStyle(
  url: string,
  username: string,
  password: string
): Promise<AuthResult> {
  try {
    const result = await connectAdapter.authenticate(url, username, password);
    return result;
  } catch {}

  try {
    const result = await restAdapter.authenticate(url, username, password);
    return result;
  } catch {}

  throw new Error(
    'Failed to authenticate with panel. Neither Connect nor REST API responded. ' +
      'Please verify the panel URL and credentials.'
  );
}

export { connectAdapter, restAdapter };
