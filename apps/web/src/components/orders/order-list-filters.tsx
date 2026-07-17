import { Search } from 'lucide-react';
import { ORDER_FILTER_STATUSES } from '@/constants/order.constants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface OrderListFiltersProps {
  search: string;
  status: string;
  sort: 'newest' | 'oldest';
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSortChange: (value: 'newest' | 'oldest') => void;
}

export function OrderListFilters({
  search,
  status,
  sort,
  onSearchChange,
  onStatusChange,
  onSortChange,
}: OrderListFiltersProps) {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_160px]">
      <div className="space-y-2">
        <Label htmlFor="order-search">Search orders</Label>
        <div className="relative">
          <Search
            className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="order-search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by order number"
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="order-status">Status</Label>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger id="order-status">
            <SelectValue placeholder="All orders" />
          </SelectTrigger>
          <SelectContent>
            {ORDER_FILTER_STATUSES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="order-sort">Sort</Label>
        <Select value={sort} onValueChange={(value) => onSortChange(value as 'newest' | 'oldest')}>
          <SelectTrigger id="order-sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
