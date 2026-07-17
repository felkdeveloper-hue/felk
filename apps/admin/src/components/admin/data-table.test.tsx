import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable } from '@/components/admin/data-table';

interface Row {
  id: string;
  name: string;
}

const rows: Row[] = [
  { id: '1', name: 'Alpha' },
  { id: '2', name: 'Beta' },
];

describe('DataTable', () => {
  it('renders rows and supports selection', () => {
    const selected: string[] = [];
    render(
      <DataTable<Row>
        data={rows}
        getRowId={(row) => row.id}
        selectedIds={selected}
        onToggleRow={(id) => selected.push(id)}
        columns={[{ id: 'name', header: 'Name', cell: (row) => row.name }]}
      />,
    );

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByLabelText('Select all rows')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(
      <DataTable<Row>
        data={[]}
        emptyMessage="Nothing here"
        getRowId={(row) => row.id}
        columns={[{ id: 'name', header: 'Name', cell: (row) => row.name }]}
      />,
    );

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});
