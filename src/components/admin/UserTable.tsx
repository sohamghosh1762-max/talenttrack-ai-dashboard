import { useState } from "react";
import {
  MoreHorizontal,
  Search,
  Eye,
  Edit2,
  UserX,
  UserCheck2,
  Trash2,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "./StatusBadge";
import type { AdminUserRecord, AdminUserRole, AdminUserStatus } from "@/data/adminTypes";
import { recentUsersInitialData } from "@/data/adminData";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UserTableProps {
  initialUsers?: AdminUserRecord[];
  onViewAll?: () => void;
}

export function UserTable({ initialUsers = recentUsersInitialData, onViewAll }: UserTableProps) {
  const [users, setUsers] = useState<AdminUserRecord[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");

  // Modal states
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    role: AdminUserRole;
    status: AdminUserStatus;
  }>({
    name: "",
    email: "",
    role: "Applicant",
    status: "Active",
  });

  const handleOpenView = (user: AdminUserRecord) => {
    setSelectedUser(user);
    setViewModalOpen(true);
  };

  const handleOpenEdit = (user: AdminUserRecord) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id
          ? {
              ...u,
              name: editForm.name,
              email: editForm.email,
              role: editForm.role,
              status: editForm.status,
            }
          : u,
      ),
    );
    toast.success(`User ${editForm.name} profile updated successfully.`);
    setEditModalOpen(false);
  };

  const handleToggleSuspend = (user: AdminUserRecord) => {
    const newStatus: AdminUserStatus = user.status === "Suspended" ? "Active" : "Suspended";
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)));
    if (newStatus === "Suspended") {
      toast.warning(`Account for ${user.name} has been suspended.`);
    } else {
      toast.success(`Account for ${user.name} has been reinstated to Active.`);
    }
  };

  const handleDeactivate = (user: AdminUserRecord) => {
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    toast.error(`User ${user.name} has been deactivated and removed.`);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.company?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "All" || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900/90 overflow-hidden">
      {/* Table Header Controls */}
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Recent Users</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Latest platform registrations and account statuses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-40 sm:w-48 rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Role Filter */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            {["All", "Recruiter", "Applicant", "Admin"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
                  roleFilter === r
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* View All */}
          <button
            type="button"
            onClick={() => {
              if (onViewAll) {
                onViewAll();
              } else {
                setRoleFilter("All");
                setSearchQuery("");
                toast.info("Showing all registered users.");
              }
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline px-2 py-1 dark:text-blue-400"
          >
            View All
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th scope="col" className="px-5 py-3.5">
                User
              </th>
              <th scope="col" className="px-4 py-3.5">
                Email
              </th>
              <th scope="col" className="px-4 py-3.5">
                Role
              </th>
              <th scope="col" className="px-4 py-3.5">
                Status
              </th>
              <th scope="col" className="px-4 py-3.5">
                Joined
              </th>
              <th scope="col" className="px-4 py-3.5 text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400">
                  No users match the search criteria.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const initials = user.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50/60 transition-colors dark:hover:bg-slate-800/40"
                  >
                    {/* User name & avatar */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">
                            {user.name}
                          </span>
                          {user.company && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate">
                              {user.company}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {user.email}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5">
                      <StatusBadge role={user.role} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge status={user.status} />
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                      {user.joined}
                    </td>

                    {/* Action 3-dot menu */}
                    <td className="px-4 py-3.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex size-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                            aria-label={`Actions for ${user.name}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 text-xs">
                          <DropdownMenuLabel className="text-[10.5px] text-slate-400 uppercase font-semibold">
                            Actions
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleOpenView(user)}
                            className="cursor-pointer gap-2"
                          >
                            <Eye className="size-3.5 text-slate-500" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenEdit(user)}
                            className="cursor-pointer gap-2"
                          >
                            <Edit2 className="size-3.5 text-slate-500" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleToggleSuspend(user)}
                            className={`cursor-pointer gap-2 ${
                              user.status === "Suspended"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {user.status === "Suspended" ? (
                              <>
                                <UserCheck2 className="size-3.5" />
                                Reinstate
                              </>
                            ) : (
                              <>
                                <UserX className="size-3.5" />
                                Suspend
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeactivate(user)}
                            className="cursor-pointer gap-2 text-rose-600 focus:text-rose-600 dark:text-rose-400"
                          >
                            <Trash2 className="size-3.5" />
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* View User Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">User Information</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Complete administrative record from the platform database.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-2 text-xs">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex size-11 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {selectedUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {selectedUser.name}
                  </h3>
                  <p className="text-slate-500 font-mono text-[11px]">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-[10.5px] uppercase font-semibold text-slate-400 block mb-1">
                    Platform Role
                  </span>
                  <StatusBadge role={selectedUser.role} />
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-[10.5px] uppercase font-semibold text-slate-400 block mb-1">
                    Account Status
                  </span>
                  <StatusBadge status={selectedUser.status} />
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-[10.5px] uppercase font-semibold text-slate-400 block mb-1">
                    Registered
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedUser.joined}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-[10.5px] uppercase font-semibold text-slate-400 block mb-1">
                    Last Activity
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedUser.lastActive || "Recently"}
                  </span>
                </div>
              </div>

              {selectedUser.company && (
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-[10.5px] uppercase font-semibold text-slate-400 block mb-1">
                    Organization / Affiliation
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedUser.company}{" "}
                    {selectedUser.location ? `• ${selectedUser.location}` : ""}
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewModalOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
            {selectedUser && (
              <Button
                size="sm"
                onClick={() => {
                  setViewModalOpen(false);
                  handleOpenEdit(selectedUser);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                Edit User
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Edit Platform User</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Modify platform role, access status, or personal information.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value as AdminUserRole })
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="Recruiter">Recruiter</option>
                    <option value="Applicant">Applicant</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value as AdminUserStatus })
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
