import { Schema, model } from 'mongoose';

const softDelete = {
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
};

/** Key/value global settings with optional encryption flag */
export const StoreSettingModel = model(
  'StoreSetting',
  new Schema(
    {
      key: { type: String, required: true, trim: true },
      value: { type: Schema.Types.Mixed, required: true },
      type: {
        type: String,
        enum: ['string', 'number', 'boolean', 'json', 'secret'],
        default: 'string',
      },
      group: {
        type: String,
        enum: [
          'store',
          'seo',
          'contact',
          'social',
          'shipping',
          'tax',
          'currency',
          'smtp',
          'analytics',
          'general',
        ],
        default: 'general',
        index: true,
      },
      isPublic: { type: Boolean, default: false },
      isEncrypted: { type: Boolean, default: false },
      description: { type: String, default: null },
      updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      ...softDelete,
    },
    { timestamps: true, collection: 'store_settings' },
  ),
);
StoreSettingModel.schema.index({ key: 1 }, { unique: true });

export const ContactInfoModel = model(
  'ContactInfo',
  new Schema(
    {
      label: { type: String, required: true },
      type: {
        type: String,
        enum: ['email', 'phone', 'address', 'whatsapp', 'other'],
        default: 'other',
      },
      value: { type: String, required: true },
      isPrimary: { type: Boolean, default: false },
      sortOrder: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['active', 'inactive', 'archived'],
        default: 'active',
      },
      ...softDelete,
    },
    { timestamps: true, collection: 'contact_infos' },
  ),
);

export const SocialLinkModel = model(
  'SocialLink',
  new Schema(
    {
      platform: { type: String, required: true },
      url: { type: String, required: true },
      icon: { type: String, default: null },
      sortOrder: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['active', 'inactive', 'archived'],
        default: 'active',
      },
      ...softDelete,
    },
    { timestamps: true, collection: 'social_links' },
  ),
);

export const ShippingZoneModel = model(
  'ShippingZone',
  new Schema(
    {
      name: { type: String, required: true },
      countries: { type: [String], default: [] },
      regions: { type: [String], default: [] },
      rateType: { type: String, enum: ['flat', 'weight', 'free'], default: 'flat' },
      rate: { type: Number, default: 0 },
      currency: { type: String, default: 'LKR' },
      minOrderAmount: { type: Number, default: null },
      estimatedDaysMin: { type: Number, default: null },
      estimatedDaysMax: { type: Number, default: null },
      status: {
        type: String,
        enum: ['active', 'inactive', 'archived'],
        default: 'active',
      },
      ...softDelete,
    },
    { timestamps: true, collection: 'shipping_zones' },
  ),
);

export const TaxConfigModel = model(
  'TaxConfig',
  new Schema(
    {
      name: { type: String, required: true },
      code: { type: String, required: true },
      ratePercent: { type: Number, required: true },
      country: { type: String, default: null },
      region: { type: String, default: null },
      isInclusive: { type: Boolean, default: false },
      status: {
        type: String,
        enum: ['active', 'inactive', 'archived'],
        default: 'active',
      },
      ...softDelete,
    },
    { timestamps: true, collection: 'tax_configs' },
  ),
);
TaxConfigModel.schema.index({ code: 1 }, { unique: true });

export const CurrencyConfigModel = model(
  'CurrencyConfig',
  new Schema(
    {
      code: { type: String, required: true, uppercase: true },
      name: { type: String, required: true },
      symbol: { type: String, required: true },
      decimalPlaces: { type: Number, default: 2 },
      exchangeRate: { type: Number, default: 1 },
      isDefault: { type: Boolean, default: false },
      status: {
        type: String,
        enum: ['active', 'inactive', 'archived'],
        default: 'active',
      },
      ...softDelete,
    },
    { timestamps: true, collection: 'currency_configs' },
  ),
);
CurrencyConfigModel.schema.index({ code: 1 }, { unique: true });

export const NewsletterTemplateModel = model(
  'NewsletterTemplate',
  new Schema(
    {
      name: { type: String, required: true },
      subject: { type: String, required: true },
      html: { type: String, default: '' },
      text: { type: String, default: '' },
      status: {
        type: String,
        enum: ['draft', 'active', 'archived'],
        default: 'draft',
      },
      ...softDelete,
    },
    { timestamps: true, collection: 'newsletter_templates' },
  ),
);

export const EmailTemplateModel = model(
  'EmailTemplate',
  new Schema(
    {
      key: { type: String, required: true },
      name: { type: String, required: true },
      subject: { type: String, required: true },
      html: { type: String, default: '' },
      text: { type: String, default: '' },
      variables: { type: [String], default: [] },
      status: {
        type: String,
        enum: ['draft', 'active', 'archived'],
        default: 'active',
      },
      ...softDelete,
    },
    { timestamps: true, collection: 'email_templates' },
  ),
);
EmailTemplateModel.schema.index({ key: 1 }, { unique: true });
