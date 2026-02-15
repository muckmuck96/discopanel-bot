import type { PanelServer } from '../panel/types.js';

export interface StatusField {
  id: string;
  label: string;
  emoji: string;
  inline: boolean;
  extract: (server: PanelServer) => string | null;
  defaultEnabled: boolean;
}

const registry: StatusField[] = [];

export function registerField(field: StatusField): void {
  const existing = registry.find((f) => f.id === field.id);
  if (existing) {
    throw new Error(`Status field with ID "${field.id}" is already registered`);
  }
  registry.push(field);
}

export function getFields(): StatusField[] {
  return [...registry];
}

export function getEnabledFields(settings: Record<string, boolean>): StatusField[] {
  return registry.filter((field) => {
    return settings[field.id] ?? field.defaultEnabled;
  });
}

export function getField(id: string): StatusField | undefined {
  return registry.find((f) => f.id === id);
}
