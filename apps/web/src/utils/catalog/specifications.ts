export interface ProductSpec {
  label: string;
  value: string;
  group?: string;
}

export function normalizeProductSpec(spec: unknown): ProductSpec | null {
  if (!spec || typeof spec !== 'object') return null;
  const record = spec as Record<string, unknown>;
  const label = String(record.label ?? record.key ?? record.name ?? '').trim();
  const value = String(record.value ?? '').trim();
  const group = typeof record.group === 'string' ? record.group.trim().toLowerCase() : undefined;
  if (!label || !value) return null;
  return { label, value, group };
}

function isReturnSpec(spec: ProductSpec): boolean {
  return spec.group === 'returns' || spec.group === 'policy' || /return/i.test(spec.label);
}

export function partitionProductSpecs(specifications: unknown[] = []) {
  const parsed = specifications
    .map(normalizeProductSpec)
    .filter((item): item is ProductSpec => Boolean(item));

  const returnSpec = parsed.find(isReturnSpec);
  const gridSpecs = parsed.filter((spec) => !isReturnSpec(spec));

  return {
    gridSpecs,
    returnPolicy: returnSpec?.value,
    highlightSpecs: gridSpecs.slice(0, 3),
  };
}

export function hasMeaningfulText(value?: string | null): boolean {
  if (!value) return false;
  const stripped = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.length > 0;
}
