import { Github, Database } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export function Header() {
  return (
    <header className="border-b bg-background">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <Database className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Ivy to Cashew Migrator</h1>
        </div>
        <div className="flex items-center space-x-4">
          <a 
            href="https://github.com/SahilSoniOrg/sql-spyglass-viewer" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center h-8 px-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            title="Total visitors to the app"
          >
            <img 
              src="https://visitor-badge.laobi.icu/badge?page_id=sql-spyglass-viewer.visitors&left_color=%23595959&right_color=%23000000&left_text=Visitors" 
              alt="Visitors" 
              className="h-4"
            />
          </a>
          
          <a 
            href="https://github.com/SahilSoniOrg/sql-spyglass-viewer" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center h-8 px-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            title="Successful migrations completed"
          >
            <img 
              src="https://visitor-badge.laobi.icu/badge?page_id=sql-spyglass-viewer.migrations&left_color=%23000000&right_color=%2300aa00&left_text=Successful Migrations&query_only=true" 
              alt="Migrations" 
              className="h-4"
            />
          </a>
          
          <Button 
            variant="ghost" 
            size="icon"
            asChild
            className="rounded-full"
          >
            <a 
              href="https://github.com/SahilSoniOrg/sql-spyglass-viewer" 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label="View on GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
