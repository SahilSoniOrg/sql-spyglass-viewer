
import { useState, useRef } from "react";
import { Upload, Database, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface FileUploadProps {
  onDatabaseLoad: (database: any, databaseInfo: any) => void;
}

const FileUpload = ({ onDatabaseLoad }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSqlJs = async () => {
    // @ts-ignore
    const initSqlJs = (await import('sql.js')).default;
    return await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    });
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().includes('.db') && 
        !file.name.toLowerCase().includes('.sqlite') && 
        !file.name.toLowerCase().includes('.sql') && 
        !file.name.toLowerCase().includes('.sqlite3')) {
      setError("Please select a valid SQLite database file (.db, .sqlite, .sql, or .sqlite3)");
      return;
    }

    setIsLoading(true);
    setError("");
    setProgress(10);

    try {
      const SQL = await loadSqlJs();
      setProgress(30);

      const arrayBuffer = await file.arrayBuffer();
      setProgress(50);

      const db = new SQL.Database(new Uint8Array(arrayBuffer));
      setProgress(70);

      // Get database schema information
      const tables = db.exec("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      
      const databaseInfo = {
        name: file.name,
        tables: tables[0] ? tables[0].values.map((row: any) => {
          const tableName = row[0];
          const tableSql = row[1];
          
          // Get column information
          const columns = db.exec(`PRAGMA table_info(${tableName})`);
          const columnInfo = columns[0] ? columns[0].values.map((col: any) => ({
            name: col[1],
            type: col[2],
            notnull: col[3] === 1,
            pk: col[5] === 1
          })) : [];

          return {
            name: tableName,
            sql: tableSql,
            columns: columnInfo
          };
        }) : []
      };

      setProgress(100);
      onDatabaseLoad(db, databaseInfo);
    } catch (err) {
      console.error("Error loading database:", err);
      setError("Failed to load database file. Please ensure it's a valid SQLite database.");
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleFileSelect = (file: File) => {
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Database className="h-6 w-6" />
          Upload SQLite Database
        </CardTitle>
        <CardDescription>
          Drag and drop your SQLite file here, or click to browse
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
            ${isDragging 
              ? 'border-primary bg-primary/10' 
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
            }
            ${isLoading ? 'pointer-events-none opacity-50' : ''}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">
            {isLoading ? "Loading database..." : "Drop your SQLite file here"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Supports .db, .sqlite, and .sqlite3 files
          </p>
          
          {isLoading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">Processing file...</p>
            </div>
          )}
          
          {!isLoading && (
            <Button variant="outline" size="sm">
              Browse Files
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".db,.sqlite,.sqlite3,.sql"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
};

export default FileUpload;
