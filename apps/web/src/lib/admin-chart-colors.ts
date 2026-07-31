/**
 * Professional multi-hue palette for admin charts.
 * Avoids near-black `--primary` fills that read as a solid black blob.
 */
export const ADMIN_CHART_COLORS = [
  '#0d9488', // teal
  '#2563eb', // blue
  '#d97706', // amber
  '#db2777', // pink
  '#7c3aed', // violet
  '#059669', // emerald
  '#ea580c', // orange
  '#0891b2', // cyan
] as const;

export function adminChartColor(index: number): string {
  return ADMIN_CHART_COLORS[index % ADMIN_CHART_COLORS.length]!;
}
