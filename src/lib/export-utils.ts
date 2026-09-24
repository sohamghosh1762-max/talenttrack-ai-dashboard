export interface ExportableUserRecord {
  id?: string | undefined;
  name?: string | undefined;
  email?: string | undefined;
  role?: string | undefined;
  status?: string | undefined;
  joined?: string | undefined;
  company?: string | undefined;
  location?: string | undefined;
  lastActive?: string | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  emailVerified?: boolean | undefined;
}

/**
 * Convert user objects to CSV string content
 */
export function generateUsersCsvContent(users: ExportableUserRecord[]): string {
  if (!users || users.length === 0) {
    return "";
  }

  const headers = [
    "User ID",
    "Full Name",
    "Email Address",
    "Role",
    "Status",
    "Email Verified",
    "Created Date / Joined",
    "Last Active",
  ];

  const rows = users.map((user) => [
    `"${user.id || ""}"`,
    `"${(user.name || "").replace(/"/g, '""')}"`,
    `"${(user.email || "").replace(/"/g, '""')}"`,
    `"${user.role || ""}"`,
    `"${user.status || ""}"`,
    user.emailVerified ? "Yes" : "No",
    `"${user.createdAt || user.joined || ""}"`,
    `"${user.lastActive || ""}"`,
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
}

/**
 * Convert user objects to CSV text format and trigger browser file download
 */
export function exportUsersToCsv(
  users: ExportableUserRecord[],
  filename: string = "talenttrack_users.csv",
): void {
  if (!users || users.length === 0 || typeof document === "undefined") {
    return;
  }

  const csvContent = generateUsersCsvContent(users);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format user objects as formatted JSON and trigger browser file download
 */
export function exportUsersToJson(
  users: ExportableUserRecord[],
  filename: string = "talenttrack_users.json",
): void {
  if (!users || users.length === 0) {
    return;
  }

  const jsonString = JSON.stringify(users, null, 2);
  const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
