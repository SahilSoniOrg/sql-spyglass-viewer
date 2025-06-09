
import { useState, useEffect } from "react";
import { Table, Eye, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";

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

interface TableViewerProps {
  database: any;
  selectedTable: string;
  tables: Table[];
}

const TableViewer = ({ database, selectedTable, tables }: TableViewerProps) => {
  const [currentTable, setCurrentTable] = useState(selectedTable);
  const [tableData, setTableData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (selectedTable) {
      setCurrentTable(selectedTable);
    }
  }, [selectedTable]);

  useEffect(() => {
    if (currentTable) {
      loadTableData(currentTable);
    }
  }, [currentTable, database]);

  const loadTableData = async (tableName: string) => {
    if (!database || !tableName) return;

    setIsLoading(true);
    setError("");

    try {
      console.log(`Loading data for table: ${tableName}`);
      
      // Get row count
      const countResult = database.exec(`SELECT COUNT(*) as count FROM "${tableName}"`);
      const totalRows = countResult[0]?.values[0][0] || 0;

      // Get sample data (limit to first 100 rows for performance)
      const dataResult = database.exec(`SELECT * FROM "${tableName}" LIMIT 100`);
      
      setTableData({
        tableName,
        totalRows,
        columns: dataResult[0]?.columns || [],
        values: dataResult[0]?.values || [],
        isLimited: totalRows > 100
      });

      toast({
        title: "Table Loaded",
        description: `Loaded ${dataResult[0]?.values?.length || 0} rows from ${tableName}`,
      });
    } catch (err) {
      console.error("Error loading table data:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load table data";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTable = () => {
    if (currentTable) {
      loadTableData(currentTable);
    }
  };

  const getTableInfo = (tableName: string) => {
    return tables.find(t => t.name === tableName);
  };

  if (!tables.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Table className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No tables available to view</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Table Viewer
            </span>
            <div className="flex items-center gap-2">
              <Select value={currentTable} onValueChange={setCurrentTable}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.name} value={table.name}>
                      {table.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshTable}
                disabled={!currentTable || isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {currentTable && !error && (
        <>
          {/* Table Schema */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Schema: {currentTable}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getTableInfo(currentTable)?.columns.map((column) => (
                  <div 
                    key={column.name}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{column.name}</span>
                      {column.pk && (
                        <Badge variant="outline" className="text-xs">PRIMARY KEY</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{column.type || 'TEXT'}</Badge>
                      {column.notnull && (
                        <Badge variant="outline">NOT NULL</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Table Data */}
          {tableData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Data: {tableData.tableName}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {tableData.totalRows} total rows
                    </Badge>
                    {tableData.isLimited && (
                      <Badge variant="outline">
                        Showing first 100 rows
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tableData.values.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No data found in this table</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] w-full">
                    <div className="min-w-full">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            {tableData.columns.map((column: string, index: number) => (
                              <th 
                                key={index}
                                className="text-left p-3 font-medium text-sm border-r last:border-r-0"
                              >
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.values.map((row: any[], rowIndex: number) => (
                            <tr 
                              key={rowIndex}
                              className="border-b hover:bg-muted/30 transition-colors"
                            >
                              {row.map((cell: any, cellIndex: number) => (
                                <td 
                                  key={cellIndex}
                                  className="p-3 text-sm border-r last:border-r-0 font-mono"
                                >
                                  {cell === null ? (
                                    <span className="text-muted-foreground italic">NULL</span>
                                  ) : typeof cell === 'string' && cell.length > 100 ? (
                                    <span title={cell}>
                                      {cell.substring(0, 100)}...
                                    </span>
                                  ) : (
                                    String(cell)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!currentTable && !error && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Select a table to view its data and schema</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TableViewer;
