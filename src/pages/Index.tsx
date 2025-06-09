
import { useState, useRef } from "react";
import { Upload, Database, Play, Table, FileText, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import FileUpload from "@/components/FileUpload";
import TablesList from "@/components/TablesList";
import QueryEditor from "@/components/QueryEditor";
import QueryResults from "@/components/QueryResults";
import TableViewer from "@/components/TableViewer";
import RecentQueries from "@/components/RecentQueries";

interface DatabaseInfo {
  name: string;
  tables: Array<{
    name: string;
    sql: string;
    columns: Array<{
      name: string;
      type: string;
      notnull: boolean;
      pk: boolean;
    }>;
  }>;
}

interface QueryResult {
  columns: string[];
  values: any[][];
  error?: string;
}

interface RecentQuery {
  query: string;
  timestamp: Date;
  success: boolean;
  rowCount?: number;
}

const Index = () => {
  const [database, setDatabase] = useState<any>(null);
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([]);

  const handleDatabaseLoad = (db: any, info: DatabaseInfo) => {
    setDatabase(db);
    setDatabaseInfo(info);
    setSelectedTable("");
    setQueryResult(null);
    setRecentQueries([]);
  };

  const handleQueryExecute = (result: QueryResult, query: string) => {
    setQueryResult(result);
    
    // Add to recent queries
    const newQuery: RecentQuery = {
      query: query.trim(),
      timestamp: new Date(),
      success: !result.error,
      rowCount: result.values?.length
    };
    
    setRecentQueries(prev => [newQuery, ...prev.slice(0, 9)]); // Keep last 10 queries
  };

  const handleLoadAnotherFile = () => {
    setDatabase(null);
    setDatabaseInfo(null);
    setSelectedTable("");
    setQueryResult(null);
    setRecentQueries([]);
  };

  const handleRefreshTables = () => {
    if (!database) return;
    
    setIsLoading(true);
    try {
      // Re-extract table information
      const tablesResult = database.exec("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      
      if (tablesResult.length > 0) {
        const tables = tablesResult[0].values.map((row: any[]) => {
          const tableName = row[0];
          const sql = row[1];
          
          // Get column information
          const columnsResult = database.exec(`PRAGMA table_info("${tableName}")`);
          const columns = columnsResult[0]?.values.map((col: any[]) => ({
            name: col[1],
            type: col[2],
            notnull: col[3] === 1,
            pk: col[5] === 1
          })) || [];
          
          return { name: tableName, sql, columns };
        });
        
        setDatabaseInfo(prev => prev ? { ...prev, tables } : null);
        toast({
          title: "Tables Refreshed",
          description: `Found ${tables.length} tables`,
        });
      }
    } catch (error) {
      console.error("Error refreshing tables:", error);
      toast({
        title: "Error",
        description: "Failed to refresh tables",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadDatabase = () => {
    if (!database) return;
    
    try {
      const data = database.export();
      const blob = new Blob([data], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = databaseInfo?.name || 'database.sqlite';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: "Database file is being downloaded",
      });
    } catch (error) {
      console.error("Error downloading database:", error);
      toast({
        title: "Error",
        description: "Failed to download database",
        variant: "destructive",
      });
    }
  };

  const handleQuerySelect = (query: string) => {
    // This will be handled by the QueryEditor component
    // We can pass this query to it
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
            <Database className="text-primary" />
            SQLite File Viewer
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload and explore SQLite databases directly in your browser. 
            Browse tables, view schemas, and execute custom queries with ease.
          </p>
        </div>

        {!database ? (
          <div className="max-w-2xl mx-auto">
            <FileUpload onDatabaseLoad={handleDatabaseLoad} />
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Database: {databaseInfo?.name}
                    </CardTitle>
                    <CardDescription>
                      {databaseInfo?.tables.length} table{databaseInfo?.tables.length !== 1 ? 's' : ''} found
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleDownloadDatabase}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download DB
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleLoadAnotherFile}
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Load Another File
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <TablesList 
                  tables={databaseInfo?.tables || []} 
                  selectedTable={selectedTable}
                  onTableSelect={setSelectedTable}
                  onRefresh={handleRefreshTables}
                  isRefreshing={isLoading}
                />
                <RecentQueries 
                  queries={recentQueries}
                  onQuerySelect={handleQuerySelect}
                />
              </div>

              <div className="lg:col-span-3">
                <Tabs defaultValue="query" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="query" className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Query Editor
                    </TabsTrigger>
                    <TabsTrigger value="table" className="flex items-center gap-2">
                      <Table className="h-4 w-4" />
                      Table Viewer
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="query" className="space-y-4">
                    <QueryEditor 
                      database={database} 
                      onQueryExecute={handleQueryExecute}
                    />
                    {queryResult && (
                      <QueryResults result={queryResult} />
                    )}
                  </TabsContent>

                  <TabsContent value="table">
                    <TableViewer 
                      database={database}
                      selectedTable={selectedTable}
                      tables={databaseInfo?.tables || []}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
