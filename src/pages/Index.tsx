import { useState, useRef } from "react";
import { Upload, Database, Play, Table, FileText, RotateCcw, Download, ArrowRight, ExternalLink } from "lucide-react";
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
import FileUploadJson from "@/components/FileUploadJson";
import { jsonToSqliteConvert } from "@/lib/jsonToSqliteConvert";

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
  accounts?: number;
  transactions?: number;
  categories?: number;
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
  const [databaseJson, setDatabaseJson] = useState<any>(null);
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);
  const [databaseInfoJson, setDatabaseInfoJson] = useState<DatabaseInfo | null>(null);
  const [isConverted, setIsConverted] = useState<boolean>(false);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([]);
  const [sqliteFileName, setSqliteFileName] = useState<string>("");
  const [jsonFileName, setJsonFileName] = useState<string>("");

  const handleDatabaseLoad = (db: any, info: DatabaseInfo) => {
    setDatabase(db);
    setDatabaseInfo(info);
    setSqliteFileName(info.name);
    setSelectedTable("");
    setQueryResult(null);
    setRecentQueries([]);
  };

  const handleJsonLoad = (db: any, info: DatabaseInfo) => {
    setDatabaseJson(db);
    setDatabaseInfoJson(info);
    setJsonFileName(info.name);
  };

  const handleProcessDatabaseJson = async () => {
    setIsLoading(true);
    try {
      await jsonToSqliteConvert(databaseJson, databaseInfoJson, database);
      setIsConverted(true);
      
      // Refresh table information after conversion
      const tablesResult = database.exec("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      
      if (tablesResult.length > 0) {
        const tables = tablesResult[0].values.map((row: any[]) => {
          const tableName = row[0];
          const sql = row[1];
          
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
      }
      
      toast({
        title: "Conversion Complete",
        description: "JSON data has been successfully converted to SQLite format",
      });
    } catch (error) {
      console.error("Conversion failed:", error);
      toast({
        title: "Conversion Failed",
        description: "Failed to convert JSON to SQLite format",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryExecute = (result: QueryResult, query: string) => {
    setQueryResult(result);
    
    const newQuery: RecentQuery = {
      query: query.trim(),
      timestamp: new Date(),
      success: !result.error,
      rowCount: result.values?.length
    };
    
    setRecentQueries(prev => [newQuery, ...prev.slice(0, 9)]);
  };

  const handleStartOver = () => {
    setDatabase(null);
    setDatabaseJson(null);
    setDatabaseInfo(null);
    setDatabaseInfoJson(null);
    setIsConverted(false);
    setSelectedTable("");
    setQueryResult(null);
    setRecentQueries([]);
    setSqliteFileName("");
    setJsonFileName("");
  };

  const handleDownloadDatabase = () => {
    if (!isConverted || !database) return;
    
    try {
      const data = database.export();
      const blob = new Blob([data], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted_${databaseInfoJson?.name || 'database'}.sqlite`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: "Converted SQLite database is being downloaded",
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
  };

  // Step 1: Upload files
  if (!database || !databaseJson) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <FileText className="text-primary" />
              JSON to SQLite Converter
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Convert your Ivy Wallet JSON data to SQLite format using your Cashew Wallet database as the base structure.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-green-200 shadow-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <Database className="h-5 w-5" />
                    Step 1: Base SQLite File
                  </CardTitle>
                  <CardDescription>
                    Upload your Cashew Wallet SQLite database file that will serve as the base structure.
                    <br />
                    <span className="text-xs text-green-700 mt-2 inline-block">
                      This file is typically exported from the Cashew Wallet app.
                    </span>
                  </CardDescription>
                  <div className="mt-2">
                    <a 
                      href="https://cashewwallet.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-800 text-sm inline-flex items-center gap-1 transition-colors"
                    >
                      Visit Cashew Wallet <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </CardHeader>
                <CardContent>
                  <FileUpload onDatabaseLoad={handleDatabaseLoad} />
                  {database && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700">✓ SQLite file '{sqliteFileName}' loaded successfully</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-purple-200 shadow-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-800">
                    <FileText className="h-5 w-5" />
                    Step 2: JSON Data
                  </CardTitle>
                  <CardDescription>
                    Upload your Ivy Wallet JSON file containing the data to be converted.
                    <br />
                    <span className="text-xs text-purple-700 mt-2 inline-block">
                      This file is typically exported from the Ivy Wallet app.
                    </span>
                  </CardDescription>
                  <div className="mt-2">
                    <a 
                      href="https://ivywallet.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-800 text-sm inline-flex items-center gap-1 transition-colors"
                    >
                      Visit Ivy Wallet <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </CardHeader>
                <CardContent>
                  <FileUploadJson onJsonLoad={handleJsonLoad} databaseJson={databaseJson} />
                  {databaseJson && (
                    <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm text-purple-700">✓ JSON file '{jsonFileName}' loaded successfully</p>
                      <div className="text-xs text-purple-600 mt-1">
                        {databaseInfoJson?.accounts} accounts, {databaseInfoJson?.transactions} transactions, {databaseInfoJson?.categories} categories
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Convert and explore
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Database className="text-primary" />
              JSON to SQLite Converter
            </h1>
            <p className="text-muted-foreground mt-2">
              {isConverted ? "Conversion complete! Explore your converted database below." : "Ready to convert your Ivy Wallet JSON data to SQLite format."}
            </p>
          </div>
          <Button variant="outline" onClick={handleStartOver}>
            <Upload className="h-4 w-4 mr-2" />
            Start Over
          </Button>
        </div>

        {!isConverted ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <ArrowRight className="h-5 w-5" />
                Convert JSON to SQLite
              </CardTitle>
              <CardDescription>
                Process your Ivy Wallet JSON data and merge it into the Cashew Wallet SQLite database
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-medium text-green-800">Cashew Wallet Database</p>
                    <p className="text-green-600 text-xs">{sqliteFileName}</p>
                  </div>
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="font-medium text-purple-800">Ivy Wallet Data</p>
                    <p className="text-purple-600 text-xs">{jsonFileName}</p>
                  </div>
                </div>
                <Button 
                  onClick={handleProcessDatabaseJson} 
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? "Converting..." : "Convert Ivy Wallet JSON to SQLite"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Converted Database</h2>
              <Button onClick={handleDownloadDatabase}>
                <Download className="h-4 w-4 mr-2" />
                Download SQLite File
              </Button>
            </div>

            <Tabs defaultValue="tables" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="tables">Tables</TabsTrigger>
                <TabsTrigger value="query">Query Editor</TabsTrigger>
                <TabsTrigger value="data">View Data</TabsTrigger>
                <TabsTrigger value="history">Query History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="tables" className="space-y-4">
                <TablesList 
                  tables={databaseInfo?.tables || []} 
                  onTableSelect={setSelectedTable}
                  selectedTable={selectedTable}
                  onRefresh={() => {}}
                />
              </TabsContent>
              
              <TabsContent value="query" className="space-y-4">
                <QueryEditor 
                  database={database} 
                  onQueryExecute={handleQueryExecute}
                />
                {queryResult && (
                  <QueryResults result={queryResult} />
                )}
              </TabsContent>
              
              <TabsContent value="data" className="space-y-4">
                {selectedTable ? (
                  <TableViewer 
                    database={database} 
                    selectedTable={selectedTable}
                    tables={databaseInfo?.tables || []} 
                  />
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Table className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Select a table from the Tables tab to view its data</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="history" className="space-y-4">
                <RecentQueries 
                  queries={recentQueries} 
                  onQuerySelect={handleQuerySelect}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
