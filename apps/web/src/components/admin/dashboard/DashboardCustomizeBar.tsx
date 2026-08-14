import { useRef } from 'react';
import {
  Copy,
  Download,
  Eye,
  EyeOff,
  LayoutTemplate,
  Plus,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
  DashboardCatalog,
  DashboardLayoutData,
  DashboardWidgetMeta,
} from '@/services/sdk/admin';

export interface DashboardCustomizeBarProps {
  customizing: boolean;
  onToggleCustomize: () => void;
  catalog?: DashboardCatalog;
  layout?: DashboardLayoutData;
  hiddenCount: number;
  onAddWidget: (widget: DashboardWidgetMeta) => void;
  onRestoreHidden: () => void;
  onApplyTemplate: (templateId: string) => void;
  onReset: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onImportFile: (file: File) => void;
}

export function DashboardCustomizeBar({
  customizing,
  onToggleCustomize,
  catalog,
  layout,
  hiddenCount,
  onAddWidget,
  onRestoreHidden,
  onApplyTemplate,
  onReset,
  onDuplicate,
  onExport,
  onImportFile,
}: DashboardCustomizeBarProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onToggleCustomize}
        className={
          customizing
            ? 'admin-btn admin-btn-primary inline-flex items-center gap-2'
            : 'admin-btn admin-btn-secondary inline-flex items-center gap-2'
        }
      >
        {customizing ? <X className="h-4 w-4" /> : <LayoutTemplate className="h-4 w-4" />}
        {customizing ? 'Done' : 'Customize'}
      </button>

      {customizing ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="admin-btn admin-btn-secondary inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add widget
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-auto">
              <DropdownMenuLabel>Widget library</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(catalog?.widgets ?? [])
                .filter((w) => w.id !== 'revenue')
                .map((w) => (
                  <DropdownMenuItem
                    key={w.id}
                    onSelect={() => onAddWidget(w)}
                    className="flex flex-col items-start gap-0.5 py-2"
                  >
                    <span className="font-medium">{w.name}</span>
                    {w.description ? (
                      <span className="text-muted-foreground text-xs">{w.description}</span>
                    ) : null}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="admin-btn admin-btn-secondary inline-flex items-center gap-2"
              >
                <LayoutTemplate className="h-4 w-4" />
                Templates
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Switch template</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(catalog?.templates ?? []).map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onSelect={() => onApplyTemplate(t.id)}
                  className="flex flex-col items-start gap-0.5 py-2"
                >
                  <span className="font-medium">{t.name}</span>
                  <span className="text-muted-foreground text-xs">{t.description}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <div className="text-muted-foreground px-2 py-1.5 text-[11px]">
                Personal layout is kept when switching templates.
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {hiddenCount > 0 ? (
            <button
              type="button"
              className="admin-btn admin-btn-secondary inline-flex items-center gap-2"
              onClick={onRestoreHidden}
            >
              <Eye className="h-4 w-4" />
              Restore ({hiddenCount})
            </button>
          ) : (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <EyeOff className="h-3.5 w-3.5" /> No hidden
            </span>
          )}

          <button
            type="button"
            className="admin-btn admin-btn-secondary inline-flex items-center gap-2"
            onClick={onDuplicate}
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-secondary inline-flex items-center gap-2"
            onClick={onExport}
          >
            <Download className="h-4 w-4" />
            Export
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-secondary inline-flex items-center gap-2"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportFile(file);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            className="admin-btn admin-btn-secondary inline-flex items-center gap-2"
            onClick={onReset}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>

          {layout ? (
            <span className="text-muted-foreground text-xs">Active: {layout.activeKey}</span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
