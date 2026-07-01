import { ReactNode } from "react";
import { useLocation } from "wouter";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/scada/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth, type Permissions } from "@/lib/auth";

interface RoleGateProps {
  /** Permission key the current user must hold to view the wrapped page. */
  needs: keyof Permissions;
  children: ReactNode;
}

/**
 * Wraps a routed page and only renders it when the active user's role grants
 * the required permission. Otherwise it renders an access-denied notice inside
 * the AppShell so the user keeps their navigation chrome and can move to a page
 * they're allowed to see.
 *
 * This is a UI affordance, not a security boundary — there's no backend and the
 * Users page is an unauthenticated demo. It exists so each role only sees the
 * surface area that's relevant to them.
 */
export function RoleGate({ needs, children }: RoleGateProps) {
  const { perms, roleInfo } = useAuth();
  const [, navigate] = useLocation();

  if (perms[needs]) {
    return <>{children}</>;
  }

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center gap-4 h-[70vh] text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30">
          <ShieldAlert className="h-8 w-8 text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            ไม่มีสิทธิ์เข้าถึงหน้านี้
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono uppercase tracking-wider">
            Access Denied
          </p>
        </div>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          บัญชีของคุณ ({roleInfo.nameTh}) ไม่มีสิทธิ์ดูหน้านี้
          กรุณาติดต่อผู้ดูแลระบบหากต้องการเข้าถึง หรือสลับเป็นบัญชีที่มีสิทธิ์ที่เมนูผู้ใช้มุมล่างซ้าย
        </p>
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
