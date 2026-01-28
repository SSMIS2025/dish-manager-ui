import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Search, Filter, ChevronUp, ChevronDown } from "lucide-react";
import { PaginationCustom } from "@/components/ui/pagination-custom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: any) => React.ReactNode;
}

interface EquipmentTableProps {
  data: any[];
  columns: Column[];
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  itemsPerPage?: number;
  searchPlaceholder?: string;
  totalCount?: number;
  emptyMessage?: string;
  colorScheme?: 'green' | 'orange' | 'purple' | 'pink' | 'blue';
}

const colorSchemes = {
  green: {
    header: 'bg-primary/5',
    badge: 'bg-primary/10 text-primary',
    row: 'hover:bg-primary/5'
  },
  orange: {
    header: 'bg-primary/5',
    badge: 'bg-primary/10 text-primary',
    row: 'hover:bg-primary/5'
  },
  purple: {
    header: 'bg-primary/5',
    badge: 'bg-primary/10 text-primary',
    row: 'hover:bg-primary/5'
  },
  pink: {
    header: 'bg-primary/5',
    badge: 'bg-primary/10 text-primary',
    row: 'hover:bg-primary/5'
  },
  blue: {
    header: 'bg-primary/5',
    badge: 'bg-primary/10 text-primary',
    row: 'hover:bg-primary/5'
  }
};

export const EquipmentTable = ({
  data,
  columns,
  onEdit,
  onDelete,
  itemsPerPage = 20,
  searchPlaceholder = "Search...",
  totalCount,
  emptyMessage = "No items found",
  colorScheme = 'blue'
}: EquipmentTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const scheme = colorSchemes[colorScheme];

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        columns.some(col => {
          const value = item[col.key];
          return value && String(value).toLowerCase().includes(query);
        })
      );
    }

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn] || '';
        const bVal = b[sortColumn] || '';
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchQuery, sortColumn, sortDirection, columns]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = processedData.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const displayCount = totalCount !== undefined ? totalCount : data.length;

  return (
    <div className="space-y-4">
      {/* Header with count, search and filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className={`text-sm px-3 py-1 ${scheme.badge}`}>
            Total: {displayCount}
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">
            Showing: {paginatedData.length}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 w-64"
            />
          </div>
          <Button variant="outline" size="icon" className="shrink-0">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader className={scheme.header}>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              {columns.map(column => (
                <TableHead 
                  key={column.key}
                  className={column.sortable ? 'cursor-pointer select-none' : ''}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && sortColumn === column.key && (
                      sortDirection === 'asc' ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-24 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 2} className="text-center py-12 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, index) => (
                <TableRow key={item.id} className={`${scheme.row} transition-colors`}>
                  <TableCell className="font-medium text-muted-foreground">
                    {startIndex + index + 1}
                  </TableCell>
                  {columns.map(column => (
                    <TableCell key={column.key}>
                      {column.render ? column.render(item[column.key], item) : item[column.key] || '-'}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(item)}
                        className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{item.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(item.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationCustom
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};
