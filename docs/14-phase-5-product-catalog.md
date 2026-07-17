# Phase 5 — Product Catalog

Backend-only Product Catalog under `/api/v1/catalog`.

**Not included:** Inventory, Cart, Wishlist, Checkout, Orders, Payments, Frontend.

## Re-seed permissions (required)

```bash
pnpm --filter @fe-platform/api seed:auth
```

New permissions:

| Permission                              | Purpose                               |
| --------------------------------------- | ------------------------------------- |
| `products.view`                         | List / read catalog                   |
| `products.create`                       | Create / duplicate / bulk create      |
| `products.update`                       | Update, media, relationships, restore |
| `products.publish`                      | Publish / schedule                    |
| `products.delete`                       | Soft delete / bulk delete             |
| `products.export`                       | Export                                |
| `products.import`                       | Import placeholder                    |
| `attributes.view` / `attributes.manage` | Attribute definitions & values        |

`products.read` remains as a legacy alias accepted by view routes.

## Module map

| Area             | Base path                                                               |
| ---------------- | ----------------------------------------------------------------------- |
| Products         | `/catalog/products`                                                     |
| Variants         | `/catalog/products/:productId/variants`, `/catalog/variants/:variantId` |
| Media            | `/catalog/products/:productId/media` (+ upload)                         |
| Relationships    | `/catalog/products/:productId/relationships`                            |
| Attributes       | `/catalog/attributes`                                                   |
| Attribute values | `/catalog/attributes/:attributeId/values`                               |

## Product APIs

| Method | Path                                 | Purpose                                           |
| ------ | ------------------------------------ | ------------------------------------------------- |
| GET    | `/products`                          | Search + advanced filters + pagination            |
| GET    | `/products/export`                   | Export page (capped)                              |
| POST   | `/products/import`                   | Import placeholder (stub)                         |
| POST   | `/products`                          | Create                                            |
| POST   | `/products/bulk`                     | Bulk create                                       |
| PATCH  | `/products/bulk`                     | Bulk update                                       |
| POST   | `/products/bulk-delete`              | Bulk soft delete                                  |
| POST   | `/products/bulk-status`              | Bulk status                                       |
| GET    | `/products/:id`                      | Detail (variants, media, relationships)           |
| PATCH  | `/products/:id`                      | Update                                            |
| DELETE | `/products/:id`                      | Soft delete                                       |
| POST   | `/products/:id/restore`              | Restore                                           |
| POST   | `/products/:id/publish`              | Publish / schedule                                |
| POST   | `/products/:id/duplicate`            | Duplicate product + variants                      |
| POST   | `/products/:productId/variants`      | Create variant                                    |
| POST   | `/variants/:variantId/clone`         | Clone variant                                     |
| POST   | `/products/:productId/media/upload`  | Upload image/video (WebP)                         |
| POST   | `/products/:productId/relationships` | Related / cross-sell / upsell / FBT / recommended |

## Search filters

`q`, `sku`, `barcode`, `brandId`, `categoryId`, `subcategoryId`, `collectionId`, `tag`/`tags`, `minPrice`/`maxPrice`, `status`, `visibility`, `gender`, feature flags, `createdFrom`/`createdTo`, `publishFrom`/`publishTo`, sort + pagination.

## Business rules

- Unique **slug**, **SKU**, **barcode**
- Sale price ≤ regular price (product + variant)
- Scheduled status requires future `publishAt`
- Rich text sanitized; images auto WebP / resize / compress via Sharp
- Local storage under `/uploads` (S3-ready `StorageService`)

## Audit events

`products.created`, `products.updated`, `products.published`, `products.deleted`, `products.price_changed`, `products.variant_added`, `products.variant_removed`, `products.seo_changed`, `products.media_added`, `products.duplicated`

## Architecture

- Models: `models/product.models.ts`
- Repository: `repositories/product.repository.ts`
- Services: `product.service`, `product-variant`, `product-media`, `product-relationship`, `product-attribute`
- Zod: `schemas/product.schema.ts`
- Routes: `routes/catalog/catalog.routes.ts`
