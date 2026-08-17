export interface MetaContentLine {
  id: string;
  quantity: number;
  item_price: number;
}

export interface MetaLineInput {
  variantId: { toString(): string } | string;
  quantity: number;
  unitPrice?: number;
  salePrice?: number | null;
  price?: number;
  lineSubtotal?: number;
}

export function lineItemPrice(line: MetaLineInput): number {
  if (typeof line.salePrice === 'number' && line.salePrice > 0) return line.salePrice;
  if (typeof line.unitPrice === 'number' && line.unitPrice > 0) return line.unitPrice;
  if (typeof line.price === 'number' && line.price > 0) return line.price;
  if (typeof line.lineSubtotal === 'number' && line.quantity > 0) {
    return Number((line.lineSubtotal / line.quantity).toFixed(2));
  }
  return 0;
}

export function buildMetaContentsFromLines(lines: MetaLineInput[]): {
  contentIds: string[];
  contents: MetaContentLine[];
  numItems: number;
} {
  const contentIds = lines.map((line) => String(line.variantId));
  const contents = lines.map((line) => ({
    id: String(line.variantId),
    quantity: line.quantity,
    item_price: lineItemPrice(line),
  }));
  const numItems = lines.reduce((sum, line) => sum + line.quantity, 0);
  return { contentIds, contents, numItems };
}

export function purchaseEventId(orderNumber: string): string {
  return `purchase-${orderNumber}`;
}

export function checkoutEventId(checkoutToken: string): string {
  return `checkout-${checkoutToken}`;
}
