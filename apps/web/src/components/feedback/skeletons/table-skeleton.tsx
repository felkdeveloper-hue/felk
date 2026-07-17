import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
  const columnKeys = Array.from({ length: columns }, (_, index) => index);
  const rowKeys = Array.from({ length: rows }, (_, index) => index);

  return (
    <div className={cn('border-border overflow-hidden rounded-lg border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columnKeys.map((column) => (
              <TableHead key={column}>
                <Skeleton className="h-3.5 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rowKeys.map((row) => (
            <TableRow key={row}>
              {columnKeys.map((column) => (
                <TableCell key={column}>
                  <Skeleton className="h-4 w-full max-w-32" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
