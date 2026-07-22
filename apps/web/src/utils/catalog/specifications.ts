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

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/** Merge saved specs with catalog fields so the PDP always shows what sellers filled. */
export function buildProductDisplaySpecs(input: {
  specifications?: unknown[];
  gender?: string;
  ageGroup?: string;
  materialLabel?: string;
  occasionLabel?: string;
  brandName?: string;
  colorLabel?: string;
  careLabel?: string;
}): ProductSpec[] {
  const fromDb = (input.specifications ?? [])
    .map(normalizeProductSpec)
    .filter((item): item is ProductSpec => Boolean(item));

  const derived: ProductSpec[] = [];
  if (input.brandName) derived.push({ label: 'Brand', value: input.brandName });
  if (input.gender) derived.push({ label: 'Gender', value: titleCase(input.gender) });
  if (input.ageGroup) derived.push({ label: 'Age group', value: titleCase(input.ageGroup) });
  if (input.materialLabel) derived.push({ label: 'Material', value: input.materialLabel });
  if (input.occasionLabel) derived.push({ label: 'Occasion', value: input.occasionLabel });
  if (input.colorLabel) derived.push({ label: 'Color', value: input.colorLabel });
  if (input.careLabel) derived.push({ label: 'Care', value: input.careLabel });

  const seen = new Set(fromDb.map((spec) => spec.label.toLowerCase()));
  // Treat "Fabric care" / "Wash care" as already covering Care
  const hasCareish = [...seen].some(
    (label) => label === 'care' || label === 'fabric care' || label === 'wash care',
  );
  const hasMaterialish = [...seen].some(
    (label) => label === 'material' || label === 'fabric' || label === 'fabrics',
  );

  for (const spec of derived) {
    const key = spec.label.toLowerCase();
    if (key === 'care' && hasCareish) continue;
    if (key === 'material' && hasMaterialish) continue;
    if (!seen.has(key)) {
      fromDb.push(spec);
      seen.add(key);
    }
  }
  return fromDb;
}

export function partitionProductSpecs(specifications: unknown[] | ProductSpec[] = []) {
  const parsed = specifications
    .map((item) => {
      if (item && typeof item === 'object' && 'label' in item && 'value' in item) {
        const row = item as ProductSpec;
        if (row.label && row.value) return row;
      }
      return normalizeProductSpec(item);
    })
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
