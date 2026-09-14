"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardView } from "@/components/dashboard/DashboardView";

export function TalentDashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <DashboardLayout searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      <DashboardView searchQuery={searchQuery} />
    </DashboardLayout>
  );
}

export default TalentDashboard;
