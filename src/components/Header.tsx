import { Github, Database } from "lucide-react";
import { Button } from "./ui/button";

export function Header() {
  return (
    <header className="border-b bg-background">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <Database className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Ivy to Cashew Migrator</h1>
        </div>
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
    </header>
  );
}
