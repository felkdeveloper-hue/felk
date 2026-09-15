import { CategoryModel } from '@/models/master-data.models.js';
import {
  FE_BASICS_DESCRIPTION,
  FE_BASICS_NAME,
  FE_BASICS_SLUG,
} from '@/constants/fe-basics.js';

/** Keep the factory-made shop destination live even if the owner seed has not been re-run. */
export async function ensureFeBasicsCategory() {
  await CategoryModel.updateOne(
    { slug: FE_BASICS_SLUG },
    {
      $set: {
        name: FE_BASICS_NAME,
        slug: FE_BASICS_SLUG,
        parentId: null,
        path: `/${FE_BASICS_SLUG}`,
        depth: 0,
        sortOrder: 1,
        status: 'active',
        isDeleted: false,
        deletedAt: null,
      },
      $setOnInsert: {
        description: FE_BASICS_DESCRIPTION,
      },
    },
    { upsert: true },
  );
}
