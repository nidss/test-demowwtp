import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import Trends from "@/pages/Trends";
import Alarms from "@/pages/Alarms";
import EquipmentPage from "@/pages/Equipment";
import SettingsPage from "@/pages/Settings";
import BuildingDetail from "@/pages/BuildingDetail";
import WwtpDashboard from "@/pages/WwtpDashboard";
import NetworkPage from "@/pages/Network";
import HospitalOverview from "@/pages/HospitalOverview";
import TasksPage from "@/pages/Tasks";
import CalendarPage from "@/pages/Calendar";
import { RoleGate } from "@/components/scada/RoleGate";
import { useAuth } from "@/lib/auth";

const queryClient = new QueryClient();

// Redirects super_admin to /network; all others see the WWTP Home dashboard
function LandingPage() {
  const { role } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (role === "super_admin") {
      navigate("/network", { replace: true });
    }
  }, [role]);

  if (role === "super_admin") return null;
  return <Home />;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <RoleGate needs="canViewOverview">
          <LandingPage />
        </RoleGate>
      </Route>
      {/* /wwtp is the persistent WWTP dashboard for Siriraj — single building
          with a selector dropdown, no role redirect */}
      <Route path="/wwtp">
        <RoleGate needs="canViewOverview">
          <WwtpDashboard />
        </RoleGate>
      </Route>
      <Route path="/trends">
        <RoleGate needs="canViewTrends">
          <Trends />
        </RoleGate>
      </Route>
      <Route path="/alarms">
        <RoleGate needs="canViewAlarms">
          <Alarms />
        </RoleGate>
      </Route>
      <Route path="/equipment">
        <RoleGate needs="canViewEquipment">
          <EquipmentPage />
        </RoleGate>
      </Route>
      <Route path="/settings">
        <RoleGate needs="canViewSettings">
          <SettingsPage />
        </RoleGate>
      </Route>
      <Route path="/building/:id">
        <RoleGate needs="canViewOverview">
          <BuildingDetail />
        </RoleGate>
      </Route>
      <Route path="/network">
        <RoleGate needs="canViewNetwork">
          <NetworkPage />
        </RoleGate>
      </Route>
      <Route path="/hospital/:id">
        <RoleGate needs="canViewNetwork">
          <HospitalOverview />
        </RoleGate>
      </Route>
      <Route path="/tasks">
        <RoleGate needs="canViewTasks">
          <TasksPage />
        </RoleGate>
      </Route>
      <Route path="/calendar">
        <RoleGate needs="canViewCalendar">
          <CalendarPage />
        </RoleGate>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
