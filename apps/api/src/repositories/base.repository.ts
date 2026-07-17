import type { FilterQuery, Model, UpdateQuery } from 'mongoose';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination';
import { parseSort } from '@/utils/sorting';
import { buildTextSearch } from '@/utils/search';
import { ApiError } from '@/utils/errors/api-error';

export interface ListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  q?: string;
  status?: string;
  includeDeleted?: boolean;
  filters?: Record<string, unknown>;
}

/** eslint-disable @typescript-eslint/no-explicit-any */
export class BaseRepository {
  constructor(
    protected readonly model: Model<any>,
    protected readonly searchFields: string[] = ['name', 'title', 'slug'],
    protected readonly sortableFields: string[] = [
      'createdAt',
      'updatedAt',
      'name',
      'title',
      'sortOrder',
      'priority',
    ],
  ) {}

  async findById(id: string, includeDeleted = false) {
    const filter: Record<string, unknown> = { _id: id };
    if (!includeDeleted) filter.isDeleted = false;
    return this.model.findOne(filter as FilterQuery<any>);
  }

  async findBySlug(slug: string, includeDeleted = false) {
    const filter: Record<string, unknown> = { slug };
    if (!includeDeleted) filter.isDeleted = false;
    return this.model.findOne(filter as FilterQuery<any>);
  }

  async list(options: ListOptions) {
    const { page, limit } = parsePagination(options);
    const filter: Record<string, unknown> = {
      ...(options.filters ?? {}),
    };

    if (!options.includeDeleted) {
      filter.isDeleted = false;
    }

    if (options.status) {
      filter.status = options.status;
    }

    const search = buildTextSearch(options.q, this.searchFields);
    if (search) {
      Object.assign(filter, search);
    }

    const sort = parseSort(options, this.sortableFields);
    const skip = getPaginationSkip(page, limit);

    const [data, total] = await Promise.all([
      this.model
        .find(filter as FilterQuery<any>)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter as FilterQuery<any>),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async create(payload: Record<string, unknown>) {
    return this.model.create(payload);
  }

  async updateById(id: string, payload: UpdateQuery<any>) {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, isDeleted: false } as FilterQuery<any>,
      payload,
      { new: true },
    );
    if (!doc) {
      throw ApiError.notFound('Resource not found');
    }
    return doc;
  }

  async softDelete(id: string) {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, isDeleted: false } as FilterQuery<any>,
      { $set: { isDeleted: true, deletedAt: new Date() } } as UpdateQuery<any>,
      { new: true },
    );
    if (!doc) {
      throw ApiError.notFound('Resource not found');
    }
    return doc;
  }

  async restore(id: string) {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, isDeleted: true } as FilterQuery<any>,
      { $set: { isDeleted: false, deletedAt: null } } as UpdateQuery<any>,
      { new: true },
    );
    if (!doc) {
      throw ApiError.notFound('Deleted resource not found');
    }
    return doc;
  }

  async bulkSoftDelete(ids: string[]) {
    const result = await this.model.updateMany(
      { _id: { $in: ids }, isDeleted: false } as FilterQuery<any>,
      { $set: { isDeleted: true, deletedAt: new Date() } } as UpdateQuery<any>,
    );
    return result.modifiedCount;
  }

  async bulkUpdateStatus(ids: string[], status: string) {
    const result = await this.model.updateMany(
      { _id: { $in: ids }, isDeleted: false } as FilterQuery<any>,
      { $set: { status } } as UpdateQuery<any>,
    );
    return result.modifiedCount;
  }
}
