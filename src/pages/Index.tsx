
import { useState, useRef } from "react";
import { Upload, Database, Play, Table, FileText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import FileUpload from "@/components/FileUpload";
import TablesList from "@/components/TablesList";
import QueryEditor from "@/components/QueryEditor";
import QueryResults from "@/components/QueryResults";
import TableViewer from "@/components/TableViewer";

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

const Index = () => {
  const [database, setDatabase] = useState<any>(null);
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDatabaseLoad = (db: any, info: DatabaseInfo) => {
    setDatabase(db);
    setDatabaseInfo(info);
    setSelectedTable("");
    setQueryResult(null);
  };

  const handleQueryExecute = (result: QueryResult) => {
    setQueryResult(result);
  };

  const handleLoadAnotherFile = () => {
    setDatabase(null);
    setDatabaseInfo(null);
    setSelectedTable("");
    setQueryResult(null);
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
                  <Button 
                    variant="outline" 
                    onClick={handleLoadAnotherFile}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Load Another File
                  </Button>
                </div>
              </CardHeader>
            </Card>

            <div className="grid lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <TablesList 
                  tables={databaseInfo?.tables || []} 
                  selectedTable={selectedTable}
                  onTableSelect={setSelectedTable}
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
