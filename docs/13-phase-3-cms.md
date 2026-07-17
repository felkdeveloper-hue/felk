# Phase 3 — CMS & Master Data

Backend-only CMS and master-data management under `/api/v1/cms`.

**Not included:** Products, Inventory, Orders, Payments, Frontend.

## Re-seed permissions (required)

```bash
pnpm --filter @fe-platform/api seed:auth
```

Super Admin / Admin receive all new CMS permissions automatically.

## Module map

| Area                         | Base path                                          | Notes                                             |
| ---------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| Categories (+ subcategories) | `/cms/categories`                                  | Tree at `/cms/categories/tree`                    |
| Brands                       | `/cms/brands`                                      |                                                   |
| Collections                  | `/cms/collections`                                 |                                                   |
| Colors / Sizes / Materials   | `/cms/colors` `/sizes` `/materials`                |                                                   |
| Product Tags / Occasions     | `/cms/tags` `/occasions`                           |                                                   |
| Season Collections           | `/cms/season-collections`                          |                                                   |
| Hero / Promo Banners         | `/cms/hero-banners` `/promo-banners`               | Responsive images + CTA + schedule                |
| Announcement Bar             | `/cms/announcements`                               |                                                   |
| Home Sections                | `/cms/home-sections`                               |                                                   |
| FAQ                          | `/cms/faqs`                                        |                                                   |
| Pages                        | `/cms/pages`                                       | Version history on update                         |
| Blog Categories / Blogs      | `/cms/blog-categories` `/blogs`                    | Publish + schedule                                |
| Contact / Social             | `/cms/contact-infos` `/social-links`               |                                                   |
| Shipping / Tax / Currency    | `/cms/shipping-zones` `/tax-configs` `/currencies` |                                                   |
| Newsletter / Email Templates | `/cms/newsletter-templates` `/email-templates`     |                                                   |
| Global Settings              | `/cms/settings`                                    | Encrypted secrets; public: `/cms/settings/public` |

## Standard CRUD per resource

| Method | Path           | Purpose                                        |
| ------ | -------------- | ---------------------------------------------- |
| GET    | `/`            | List (pagination, search, sort, status filter) |
| GET    | `/export`      | Export page (capped)                           |
| GET    | `/:id`         | Get one                                        |
| POST   | `/`            | Create                                         |
| PATCH  | `/:id`         | Update                                         |
| DELETE | `/:id`         | Soft delete                                    |
| POST   | `/:id/restore` | Restore                                        |
| POST   | `/bulk-delete` | Bulk soft delete                               |
| POST   | `/bulk-status` | Bulk status change                             |

Every mutation writes **audit** + **activity** logs. Routes are RBAC-protected (`authorizeAny`).

## SEO fields (where applicable)

`title`, `description`, `canonicalUrl`, `keywords`, `ogImage`, `twitterCard`, `schemaJson`, `robots` + `slug`.

## Architecture notes

- Shared CRUD factory: `routes/cms/create-crud-router.ts`
- Shared service: `services/cms-crud.service.ts`
- Shared repository: `repositories/base.repository.ts`
- Rich text sanitized via `sanitize-html`
- SMTP / secret settings encrypted with AES-256-GCM
