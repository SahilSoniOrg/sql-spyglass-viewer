
import { Table, Columns, Key, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Table {
  name: string;
  sql: string;
  columns: Array<{
    name: string;
    type: string;
    notnull: boolean;
    pk: boolean;
  }>;
}

interface TablesListProps {
  tables: Table[];
  selectedTable: string;
  onTableSelect: (tableName: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const TablesList = ({ tables, selectedTable, onTableSelect, onRefresh, isRefreshing }: TablesListProps) => {
  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Table className="h-5 w-5" />
            Tables ({tables.length})
          </CardTitle>
          {onRefresh && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="space-y-2 p-4">
            {tables.map((table) => (
              <div key={table.name} className="space-y-2">
                <Button
                  variant={selectedTable === table.name ? "default" : "ghost"}
                  className="w-full justify-start h-auto p-3"
                  onClick={() => onTableSelect(table.name)}
                >
                  <div className="flex flex-col items-start gap-1 w-full">
                    <div className="flex items-center gap-2">
                      <Table className="h-4 w-4" />
                      <span className="font-medium">{table.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Columns className="h-3 w-3" />
                      {table.columns.length} columns
                    </div>
                  </div>
                </Button>
                
                {selectedTable === table.name && (
                  <div className="ml-4 space-y-1 pb-2">
                    {table.columns.map((column) => (
                      <div 
                        key={column.name}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {column.pk && <Key className="h-3 w-3 text-yellow-500" />}
                          <span className="font-mono">{column.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {column.type || 'TEXT'}
                          </Badge>
                          {column.notnull && (
                            <Badge variant="outline" className="text-xs">
                              NOT NULL
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {tables.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Table className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No tables found in this database</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TablesList;
