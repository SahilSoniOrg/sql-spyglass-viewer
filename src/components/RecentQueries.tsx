
import { History, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RecentQuery {
  query: string;
  timestamp: Date;
  success: boolean;
  rowCount?: number;
}

interface RecentQueriesProps {
  queries: RecentQuery[];
  onQuerySelect: (query: string) => void;
}

const RecentQueries = ({ queries, onQuerySelect }: RecentQueriesProps) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const truncateQuery = (query: string, maxLength: number = 50) => {
    return query.length > maxLength ? query.substring(0, maxLength) + '...' : query;
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Recent Queries ({queries.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 p-4">
            {queries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No queries executed yet</p>
              </div>
            ) : (
              queries.map((queryItem, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full justify-start h-auto p-3 text-left"
                  onClick={() => onQuerySelect(queryItem.query)}
                >
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center justify-between w-full">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {truncateQuery(queryItem.query)}
                      </code>
                      <Badge variant={queryItem.success ? "default" : "destructive"} className="text-xs">
                        {queryItem.success ? (
                          queryItem.rowCount !== undefined ? `${queryItem.rowCount} rows` : 'Success'
                        ) : (
                          'Error'
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTime(queryItem.timestamp)}
                    </div>
                  </div>
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RecentQueries;
