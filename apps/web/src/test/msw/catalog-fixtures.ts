import { http, HttpResponse } from 'msw';

const API = 'http://localhost:4000/api/v1';

const paginated = <T>(data: T[]) =>
  HttpResponse.json({
    success: true,
    data,
    meta: {
      page: 1,
      limit: 50,
      total: data.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  });

export const catalogProducts = [
  {
    _id: 'prod_1',
    name: 'Silk Column Dress',
    slug: 'silk-column-dress',
    shortDescription: 'Fluid silk with a clean column silhouette.',
    description: 'A minimalist silk dress designed for evening and occasion wear.',
    status: 'active',
    isNewArrival: true,
    isOnSale: false,
    brandId: 'brand_1',
    categoryId: 'cat_1',
    pricing: { price: 420, salePrice: null, compareAtPrice: 480, currency: 'USD' },
    thumbnailUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d58199?w=800',
    media: [
      {
        _id: 'm1',
        url: 'https://images.unsplash.com/photo-1595777457583-95e059d58199?w=800',
        alt: 'Silk Column Dress front',
        isPrimary: true,
      },
      {
        _id: 'm2',
        url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800',
        alt: 'Silk Column Dress detail',
      },
    ],
    variants: [
      {
        _id: 'var_1',
        productId: 'prod_1',
        sku: 'SCD-BLK-S',
        colorId: 'color_1',
        sizeId: 'size_1',
        price: 420,
        currency: 'USD',
        status: 'active',
        isDefault: true,
      },
    ],
    specifications: [{ label: 'Fabric', value: '100% silk' }],
  },
  {
    _id: 'prod_2',
    name: 'Tailored Wool Blazer',
    slug: 'tailored-wool-blazer',
    shortDescription: 'Structured blazer in Italian wool.',
    status: 'active',
    isBestSeller: true,
    isOnSale: true,
    brandId: 'brand_1',
    categoryId: 'cat_2',
    pricing: { price: 520, salePrice: 390, compareAtPrice: 520, currency: 'USD' },
    pricingInsights: { effectivePrice: 390, isOnSale: true, discountPercent: 25, currency: 'USD' },
    thumbnailUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800',
    media: [
      {
        _id: 'm3',
        url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800',
        alt: 'Tailored Wool Blazer',
        isPrimary: true,
      },
    ],
  },
];

export const catalogCategories = [
  {
    _id: 'cat_1',
    name: 'Dresses',
    slug: 'dresses',
    description: 'Elevated dresses for every occasion.',
    image: { url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=900' },
    status: 'active',
    parentId: null,
  },
  {
    _id: 'cat_2',
    name: 'Tailoring',
    slug: 'tailoring',
    description: 'Structured silhouettes and sharp lines.',
    image: { url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=900' },
    status: 'active',
    parentId: null,
  },
];

export const catalogHandlers = [
  http.get(`${API}/catalog/products`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase();
    const categoryId = url.searchParams.get('categoryId');
    let data = [...catalogProducts];
    if (q)
      data = data.filter((item) => item.slug.includes(q) || item.name.toLowerCase().includes(q));
    if (categoryId) data = data.filter((item) => item.categoryId === categoryId);
    return paginated(data);
  }),
  http.get(`${API}/catalog/products/:id`, ({ params }) => {
    const product = catalogProducts.find((item) => item._id === params.id);
    if (!product)
      return HttpResponse.json(
        { success: false, error: { message: 'Not found' } },
        { status: 404 },
      );
    return HttpResponse.json({ success: true, data: product });
  }),
  http.get(`${API}/catalog/products/:id/variants`, ({ params }) =>
    HttpResponse.json({
      success: true,
      data: catalogProducts.find((item) => item._id === params.id)?.variants ?? [],
    }),
  ),
  http.get(`${API}/catalog/products/:id/media`, ({ params }) =>
    HttpResponse.json({
      success: true,
      data: catalogProducts.find((item) => item._id === params.id)?.media ?? [],
    }),
  ),
  http.get(`${API}/catalog/products/:id/relationships`, () =>
    HttpResponse.json({ success: true, data: [] }),
  ),
  http.get(`${API}/cms/categories`, () => paginated(catalogCategories)),
  http.get(`${API}/cms/categories/tree`, () =>
    HttpResponse.json({ success: true, data: catalogCategories }),
  ),
  http.get(`${API}/cms/brands`, () =>
    paginated([
      { _id: 'brand_1', name: 'Atelier Studio', slug: 'atelier-studio', status: 'active' },
    ]),
  ),
  http.get(`${API}/cms/collections`, () =>
    paginated([{ _id: 'col_1', name: 'Resort Edit', slug: 'resort-edit', status: 'active' }]),
  ),
  http.get(`${API}/cms/colors`, () =>
    paginated([{ _id: 'color_1', name: 'Black', slug: 'black', status: 'active' }]),
  ),
  http.get(`${API}/cms/sizes`, () =>
    paginated([{ _id: 'size_1', name: 'S', slug: 's', status: 'active' }]),
  ),
  http.get(`${API}/cms/materials`, () =>
    paginated([{ _id: 'mat_1', name: 'Silk', slug: 'silk', status: 'active' }]),
  ),
  http.get(`${API}/cms/occasions`, () =>
    paginated([{ _id: 'occ_1', name: 'Evening', slug: 'evening', status: 'active' }]),
  ),
];
