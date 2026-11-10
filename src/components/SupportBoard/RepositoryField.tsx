import React, { useMemo, useState } from 'react';

export interface RepositoryOptions {
  repositories?: string;
  defaultRepository?: string;
}

export interface SnapsSupportBoardRepositoryAttributes {
  repositories?: string;
  'default-repository'?: string;
}

export const repositoryUnavailable = 'Este repositório não está disponível para o projeto da sua chave. Escolha outro na lista ou peça ao administrador para conferir a configuração do host.';

function parseRepositories(csv: string | undefined) {
  const options = new Map<string, string>();
  for (const token of (csv ?? '').split(',')) {
    const name = token.trim();
    const identity = name.toLowerCase();
    if (name && !options.has(identity)) options.set(identity, name);
  }
  return [...options.values()];
}

export function useRepositorySelection(repositories?: string, defaultRepository?: string) {
  const options = useMemo(() => parseRepositories(repositories), [repositories]);
  const initial = options.length === 1
    ? options[0]
    : options.find(name => name.toLowerCase() === defaultRepository?.trim().toLowerCase()) ?? '';
  const scope = JSON.stringify([options, initial]);
  const [selection, setSelection] = useState({ scope, value: initial });
  return {
    options,
    value: selection.scope === scope ? selection.value : initial,
    select: (value: string) => setSelection({ scope, value }),
  };
}

export function RepositoryField({ selection, disabled, onChange }: {
  selection: ReturnType<typeof useRepositorySelection>;
  disabled?: boolean;
  onChange?: () => void;
}) {
  if (!selection.options.length) return null;
  return <label className="block space-y-1 text-sm">
    <span className="font-semibold">Repositório</span>
    <select className="block w-full rounded border bg-white p-2 disabled:bg-slate-100"
      value={selection.value} disabled={disabled || selection.options.length === 1}
      required onChange={event => { selection.select(event.target.value); onChange?.(); }}>
      {selection.options.length > 1 && <option value="">Escolha um repositório</option>}
      {selection.options.map(name => <option key={name} value={name}>{name}</option>)}
    </select>
  </label>;
}
