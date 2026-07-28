import { http } from '@/lib/http-client';
import { mapList } from '@/utils/cms';
import { normalizeCategory } from '@/utils/catalog/normalize';
import type { ListQueryParams, PaginatedResult } from '@/types';

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  status?: string;
  depth?: number;
  path?: string;
  /** Ordered filter section keys for this category’s PLP. */
  filterFacetKeys?: string[];
  seo?: Record<string, unknown>;
  children?: Category[];
  [key: string]: unknown;
}

export interface CategoryTreeNode extends Category {
  children?: CategoryTreeNode[];
}

/** Typed SDK for `/cms/categories*`. */
export const categoriesApi = {
  async list(params?: ListQueryParams): Promise<PaginatedResult<Category>> {
    const result = await http.getPaginated<unknown>('/storefront/categories', { params });
    return { ...result, data: mapList(result.data, normalizeCategory) };
  },

  async tree(): Promise<CategoryTreeNode[]> {
    const result = await http.getPaginated<unknown>('/storefront/categories', {
      params: { status: 'active', limit: 100, sortBy: 'sortOrder', sortOrder: 'asc' },
    });
    const rows = result.data;
    const normalizeTree = (nodes: unknown[]): CategoryTreeNode[] =>
      mapList(nodes, (node) => {
        const category = normalizeCategory(node) as CategoryTreeNode;
        const record = node as Record<string, unknown>;
        if (Array.isArray(record.children)) {
          category.children = normalizeTree(record.children);
        }
        return category;
      });
    return normalizeTree(rows);
  },

  async getById(id: string): Promise<Category> {
    const result = await this.list({ status: 'active', limit: 100 });
    const category = result.data.find((item) => item.id === id || item.slug === id);
    if (!category) throw new Error('Category not found');
    return category;
  },

  async getBySlug(slug: string): Promise<Category | null> {
    // Prefer the active list (usually already warm from bootstrap) over a
    // separate `?q=` request that scanned 100 rows on every category PLP.
    const result = await this.list({
      status: 'active',
      limit: 100,
      sortBy: 'sortOrder',
      sortOrder: 'asc',
    });
    return result.data.find((category) => category.slug === slug) ?? null;
  },
};
