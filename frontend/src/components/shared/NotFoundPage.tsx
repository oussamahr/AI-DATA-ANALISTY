import { Link } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-6">
        <FileQuestion className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted-foreground max-w-sm">
        The page you're looking for doesn't exist or you don't have access to it.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild>
          <Link to="/">Go to Dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/datasets">Browse Datasets</Link>
        </Button>
      </div>
    </div>
  );
}
