import { Types } from 'mongoose';
import {
  DashboardLayoutModel,
  type DashboardLayoutSnapshot,
  type DashboardWidgetPlacement,
} from '@/models/analytics/dashboard-layout.model.js';
import {
  getRoleDefaultWidgets,
  getTemplate,
  listTemplates,
  ROLE_DEFAULT_TEMPLATE,
} from './layout.defaults.js';
import { filterWidgetsByPermissions, listWidgetDefinitions } from './widget.registry.js';

function snapshotFromMap(
  layouts: Map<string, DashboardLayoutSnapshot> | Record<string, DashboardLayoutSnapshot>,
  key: string,
): DashboardLayoutSnapshot | null {
  if (layouts instanceof Map) {
    return layouts.get(key) ?? null;
  }
  return (layouts as Record<string, DashboardLayoutSnapshot>)[key] ?? null;
}

function setSnapshot(
  doc: InstanceType<typeof DashboardLayoutModel>,
  key: string,
  snap: DashboardLayoutSnapshot,
): void {
  if (doc.layouts instanceof Map) {
    doc.layouts.set(key, snap);
  } else {
    (doc.layouts as Record<string, DashboardLayoutSnapshot>)[key] = snap;
  }
  doc.markModified('layouts');
}

function cloneWidgets(widgets: DashboardWidgetPlacement[]): DashboardWidgetPlacement[] {
  return widgets.map((w, idx) => ({
    ...w,
    i: `${w.widgetId}-${Date.now().toString(36)}-${idx}`,
    settings: { ...(w.settings ?? {}) },
  }));
}

function toPublic(doc: InstanceType<typeof DashboardLayoutModel>) {
  const layoutsObj: Record<string, DashboardLayoutSnapshot> = {};
  if (doc.layouts instanceof Map) {
    for (const [k, v] of doc.layouts.entries()) {
      layoutsObj[k] = {
        widgets: v.widgets ?? [],
        theme: v.theme ?? {},
        updatedAt: v.updatedAt,
      };
    }
  } else {
    Object.assign(layoutsObj, doc.layouts ?? {});
  }

  const activeKey = doc.activeKey || 'personal';
  const active = layoutsObj[activeKey] ?? layoutsObj.personal ?? { widgets: [], theme: {} };

  return {
    id: String(doc._id),
    userId: String(doc.userId),
    activeKey,
    widgets: active.widgets ?? [],
    theme: active.theme ?? {},
    layoutKeys: Object.keys(layoutsObj),
    layouts: layoutsObj,
    roleDefaultApplied: doc.roleDefaultApplied ?? null,
    updatedAt: doc.updatedAt,
  };
}

async function ensureLayout(userId: string, roleKey: string) {
  let doc = await DashboardLayoutModel.findOne({ userId });
  if (doc) return doc;

  const widgets = getRoleDefaultWidgets(roleKey);
  const templateId = ROLE_DEFAULT_TEMPLATE[roleKey] ?? 'executive';
  doc = await DashboardLayoutModel.create({
    userId: new Types.ObjectId(userId),
    activeKey: 'personal',
    roleDefaultApplied: templateId,
    layouts: {
      personal: {
        widgets: cloneWidgets(widgets),
        theme: {},
        updatedAt: new Date(),
      },
    },
  });
  return doc;
}

export async function getDashboardLayout(userId: string, roleKey: string) {
  const doc = await ensureLayout(userId, roleKey);
  return toPublic(doc);
}

export async function saveDashboardLayout(
  userId: string,
  roleKey: string,
  input: {
    layoutKey?: string;
    activeKey?: string;
    widgets: DashboardWidgetPlacement[];
    theme?: Record<string, unknown>;
  },
) {
  const doc = await ensureLayout(userId, roleKey);
  const key = input.layoutKey ?? doc.activeKey ?? 'personal';
  setSnapshot(doc, key, {
    widgets: input.widgets,
    theme: input.theme ?? snapshotFromMap(doc.layouts, key)?.theme ?? {},
    updatedAt: new Date(),
  });
  if (input.activeKey) doc.activeKey = input.activeKey;
  else if (!doc.activeKey) doc.activeKey = key;
  await doc.save();
  return toPublic(doc);
}

export async function applyDashboardTemplate(
  userId: string,
  roleKey: string,
  templateId: string,
  overwritePersonal = false,
) {
  const template = getTemplate(templateId);
  if (!template) {
    throw Object.assign(new Error(`Unknown template: ${templateId}`), { statusCode: 400 });
  }
  const doc = await ensureLayout(userId, roleKey);
  const snap: DashboardLayoutSnapshot = {
    widgets: cloneWidgets(template.widgets),
    theme: {},
    updatedAt: new Date(),
  };

  if (overwritePersonal) {
    setSnapshot(doc, 'personal', snap);
    doc.activeKey = 'personal';
  } else {
    const key = `template:${templateId}`;
    setSnapshot(doc, key, snap);
    doc.activeKey = key;
  }
  await doc.save();
  return toPublic(doc);
}

export async function resetDashboardLayout(userId: string, roleKey: string) {
  const doc = await ensureLayout(userId, roleKey);
  const widgets = getRoleDefaultWidgets(roleKey);
  setSnapshot(doc, 'personal', {
    widgets: cloneWidgets(widgets),
    theme: {},
    updatedAt: new Date(),
  });
  doc.activeKey = 'personal';
  doc.roleDefaultApplied = ROLE_DEFAULT_TEMPLATE[roleKey] ?? 'executive';
  await doc.save();
  return toPublic(doc);
}

export async function duplicateDashboardLayout(
  userId: string,
  roleKey: string,
  fromKey: string,
  toKey: string,
  setActive = false,
) {
  const doc = await ensureLayout(userId, roleKey);
  const source = snapshotFromMap(doc.layouts, fromKey);
  if (!source) {
    throw Object.assign(new Error(`Layout not found: ${fromKey}`), { statusCode: 404 });
  }
  setSnapshot(doc, toKey, {
    widgets: cloneWidgets(source.widgets ?? []),
    theme: { ...(source.theme ?? {}) },
    updatedAt: new Date(),
  });
  if (setActive) doc.activeKey = toKey;
  await doc.save();
  return toPublic(doc);
}

export async function importDashboardLayout(
  userId: string,
  roleKey: string,
  layoutKey: string,
  snapshot: DashboardLayoutSnapshot,
  setActive = true,
) {
  const doc = await ensureLayout(userId, roleKey);
  setSnapshot(doc, layoutKey, {
    widgets: cloneWidgets(snapshot.widgets ?? []),
    theme: snapshot.theme ?? {},
    updatedAt: new Date(),
  });
  if (setActive) doc.activeKey = layoutKey;
  await doc.save();
  return toPublic(doc);
}

export function getDashboardCatalog(permissionKeys: string[]) {
  return {
    widgets: filterWidgetsByPermissions(permissionKeys),
    templates: listTemplates(),
    allWidgets: listWidgetDefinitions(),
  };
}

export { listTemplates } from './layout.defaults.js';
export { listWidgetDefinitions, registerDashboardWidget } from './widget.registry.js';
