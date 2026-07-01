import { useLocation } from "wouter";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/scada/AppShell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [location, navigate] = useLocation();

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center gap-4 h-[70vh] text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted border border-border">
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-mono text-foreground">404</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ไม่พบหน้าที่คุณต้องการ
          </p>
          <p className="text-[11px] text-muted-foreground/70 font-mono mt-1">
            {location}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="gap-2 font-mono"
        >
          <ArrowLeft className="h-4 w-4" /> กลับหน้าหลัก
        </Button>
      </div>
    </AppShell>
  );
}
