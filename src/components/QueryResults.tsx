
import { Download, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface QueryResult {
  columns: string[];
  values: any[][];
  error?: string;
}

interface QueryResultsProps {
  result: QueryResult;
}

const QueryResults = ({ result }: QueryResultsProps) => {
  const downloadCSV = () => {
    if (!result.columns.length || !result.values.length) return;

    const csvContent = [
      result.columns.join(','),
      ...result.values.map(row => 
        row.map(cell => 
          typeof cell === 'string' && cell.includes(',') 
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query_results.csv';
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Query results exported as CSV file.",
    });
  };

  const copyResults = () => {
    if (!result.columns.length || !result.values.length) return;

    const textContent = [
      result.columns.join('\t'),
      ...result.values.map(row => row.join('\t'))
    ].join('\n');

    navigator.clipboard.writeText(textContent);
    toast({
      title: "Copied",
      description: "Query results copied to clipboard.",
    });
  };

  if (result.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          <strong>SQL Error:</strong> {result.error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!result.columns.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>Query executed successfully but returned no results.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Query Results</span>
            <Badge variant="secondary">
              {result.values.length} row{result.values.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyResults}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCSV}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full">
          <div className="min-w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  {result.columns.map((column, index) => (
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
                {result.values.map((row, rowIndex) => (
                  <tr 
                    key={rowIndex}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    {row.map((cell, cellIndex) => (
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
      </CardContent>
    </Card>
  );
};

export default QueryResults;
