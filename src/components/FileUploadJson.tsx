
import { useState, useRef } from "react";
import { Upload, Database, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface FileUploadProps {
    onJsonLoad: (database: any, databaseInfo: any) => void;
    databaseJson: any;
}
const tryDecode = (buffer: ArrayBuffer): string => {
    try {
        console.log("Trying UTF-8");
      return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      try {
        console.log("Trying UTF-16");
        return new TextDecoder("utf-16", { fatal: true }).decode(buffer);
      } catch {
        throw new Error("Unsupported file encoding. Expected UTF-8 or UTF-16.");
      }
    }
  };

const FileUploadJson = ({ onJsonLoad, databaseJson }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().includes('.json')) {
      setError("Please select a valid JSON file");
      return;
    }

    setIsLoading(true);
    setError("");
    setProgress(10);

    try {
      setProgress(30);

      const text = await file.text();
      setProgress(50);
      setFileName(file.name);
      const db = JSON.parse(text);
      setProgress(80);
    //verify that the json have these fields, if not, throw an error
    // 1. accounts
    // 2. transactions
    // 3. categories
    // 4. plannedPayments
    if (!db.accounts || !db.transactions || !db.categories || !db.plannedPaymentRules) {
        console.log(db);
        console.log(db.plannedPaymentRules);
        console.log(db.categories);
        console.log(db.transactions);
        console.log(db.accounts);
      throw new Error("Invalid JSON file. Please ensure it's a valid IvyWallet JSON file.");
    }
      
      const jsonInfo = {
        name: file.name,
        accounts: db.accounts.length,
        transactions: db.transactions.length,
        categories: db.categories.length,
        plannedPayments: db.plannedPaymentRules.length,
        fullJson: db,
      };

      setProgress(100);
      onJsonLoad(db, jsonInfo);
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
          {fileName ? "File selected: " + fileName : "Upload JSON File"}
        </CardTitle>
        <CardDescription>
          {fileName ? "Click to select another file" : "Drag and drop your JSON file here, or click to browse"}
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
            {isLoading ? "Loading IvyWallet JSON..." : "Drop your IvyWallet JSON file here"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Supports .json files
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
          accept=".json"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
};

export default FileUploadJson;
