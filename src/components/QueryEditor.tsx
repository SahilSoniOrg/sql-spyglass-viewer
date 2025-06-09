
import { useState } from "react";
import { Play, Copy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface QueryEditorProps {
  database: any;
  onQueryExecute: (result: any, query: string) => void;
}

const QueryEditor = ({ database, onQueryExecute }: QueryEditorProps) => {
  const [query, setQuery] = useState("SELECT name FROM sqlite_master WHERE type='table';");
  const [isExecuting, setIsExecuting] = useState(false);

  const executeQuery = async () => {
    if (!query.trim()) {
      toast({
        title: "Empty Query",
        description: "Please enter a SQL query to execute.",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    
    try {
      console.log("Executing query:", query);
      const result = database.exec(query);
      
      if (result.length === 0) {
        onQueryExecute({
          columns: [],
          values: [],
          error: undefined
        }, query);
        toast({
          title: "Query Executed",
          description: "Query executed successfully (no results returned).",
        });
      } else {
        onQueryExecute({
          columns: result[0].columns,
          values: result[0].values,
          error: undefined
        }, query);
        toast({
          title: "Query Executed",
          description: `Query executed successfully. ${result[0].values.length} rows returned.`,
        });
      }
    } catch (error) {
      console.error("Query execution error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      onQueryExecute({
        columns: [],
        values: [],
        error: errorMessage
      }, query);
      
      toast({
        title: "Query Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const copyQuery = () => {
    navigator.clipboard.writeText(query);
    toast({
      title: "Copied",
      description: "Query copied to clipboard.",
    });
  };

  const clearQuery = () => {
    setQuery("");
  };

  const insertSampleQueries = (sampleQuery: string) => {
    setQuery(sampleQuery);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            SQL Query Editor
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyQuery}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={clearQuery}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => insertSampleQueries("SELECT name FROM sqlite_master WHERE type='table';")}
            >
              List Tables
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => insertSampleQueries("SELECT sql FROM sqlite_master WHERE type='table';")}
            >
              Show Schemas
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => insertSampleQueries("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table';")}
            >
              Count Tables
            </Button>
          </div>
        </div>
        
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your SQL query here..."
          className="font-mono text-sm min-h-[120px]"
          spellCheck={false}
        />
        
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Press Ctrl+Enter or click Execute to run the query
          </p>
          <Button 
            onClick={executeQuery} 
            disabled={isExecuting || !query.trim()}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isExecuting ? "Executing..." : "Execute Query"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QueryEditor;
