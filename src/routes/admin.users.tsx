import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createUserWithRole, setUserRole, deactivateUser, updateUserByAdmin, archiveUserByAdmin, deleteUserByAdmin } from "@/lib/admin-users.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import { Pencil, UserPlus, Wallet } from "lucide-react";
import { DsaPayoutSettingsDialog } from "@/components/DsaPayoutSettingsDialog";
import { AdminRecordActions } from "@/components/AdminRecordActions";
import { useAuth } from "@/hooks/useAuth";

const ROLES = ["admin", "customer", "dsa", "rm", "loan_executive", "team_leader"] as const;
type Role = (typeof ROLES)[number];

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [
    { title: "Users | Loans Mart India Admin" },
    { name: "description", content: "Manage customer and employee accounts." },
    { property: "og:title", content: "Users | Loans Mart India Admin" },
    { property: "og:description", content: "Manage customer and employee accounts." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Users,
});

function Users() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const createFn = useServerFn(createUserWithRole);
  const setRoleFn = useServerFn(setUserRole);
  const toggleFn = useServerFn(deactivateUser);
  const updateFn = useServerFn(updateUserByAdmin);
  const archiveFn = useServerFn(archiveUserByAdmin);
  const deleteFn = useServerFn(deleteUserByAdmin);
  const [archiveFilter, setArchiveFilter] = useState("active");
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", phone: "", role: "customer" as Role, is_active: true });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () =>
      (await supabase.from("profiles").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: roles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => (await supabase.from("user_roles").select("*")).data ?? [],
  });
  const { data: loanTypes } = useQuery({
    queryKey: ["admin-loan-types-active"],
    queryFn: async () =>
      (await supabase.from("loan_types").select("id,name").eq("is_active", true).order("name")).data ?? [],
  });

  const assignRole = useMutation({
    mutationFn: (v: { userId: string; role: Role }) =>
      setRoleFn({ data: { user_id: v.userId, role: v.role } }),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: (v: { id: string; is_active: boolean }) =>
      toggleFn({ data: { user_id: v.id, is_active: v.is_active } }),
    onSuccess: () => {
      toast.success("User updated");
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "customer" as Role,
    loan_type_id: "",
    amount_requested: "",
  });

  const createUser = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          phone: form.phone,
          role: form.role,
          loan_type_id: form.role === "customer" ? form.loan_type_id || "" : "",
          amount_requested:
            form.role === "customer" && form.amount_requested ? Number(form.amount_requested) : undefined,
        },
      }),
    onSuccess: (res: any) => {
      toast.success(
        res?.application_id
          ? "User created with loan application"
          : "User created"
      );
      setOpen(false);
      setForm({ email: "", password: "", full_name: "", phone: "", role: "customer", loan_type_id: "", amount_requested: "" });
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const refreshUsers = () => {
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    qc.invalidateQueries({ queryKey: ["admin-roles"] });
  };
  const updateUser = useMutation({
    mutationFn: () => updateFn({ data: { user_id: editing.id, ...editForm } }),
    onSuccess: () => { toast.success("User details updated"); setEditing(null); refreshUsers(); },
    onError: (e: any) => toast.error(e.message),
  });
  const archiveUser = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => archiveFn({ data: { user_id: id, archived } }),
    onSuccess: (_r, v) => { toast.success(v.archived ? "User archived" : "User restored"); refreshUsers(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteUser = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { user_id: id } }),
    onSuccess: () => { toast.success("User permanently deleted"); refreshUsers(); },
    onError: (e: any) => toast.error(e.message),
  });

  const visibleProfiles = (profiles ?? []).filter((p: any) => archiveFilter === "all" || (archiveFilter === "archived" ? !!p.archived_at : !p.archived_at));
  const openEdit = (profile: any, role: Role) => {
    setEditing(profile);
    setEditForm({ full_name: profile.full_name ?? "", email: profile.email ?? "", phone: profile.phone ?? "", role, is_active: profile.is_active });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-3xl font-bold">Users</h1>
        <div className="flex gap-2">
        <Select value={archiveFilter} onValueChange={setArchiveFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem><SelectItem value="all">All</SelectItem></SelectContent></Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-2" />Create User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create new user</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Temporary password</Label><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" /></div>
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.role === "customer" && (
                <>
                  <div>
                    <Label>Loan product</Label>
                    <Select value={form.loan_type_id} onValueChange={(v) => setForm({ ...form, loan_type_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select a product (optional)" /></SelectTrigger>
                      <SelectContent>
                        {loanTypes?.map((lt: any) => <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">An application is created so the customer can upload required documents on login.</p>
                  </div>
                  <div>
                    <Label>Loan amount (optional)</Label>
                    <Input type="number" value={form.amount_requested} onChange={(e) => setForm({ ...form, amount_requested: e.target.value })} placeholder="e.g. 500000" />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createUser.mutate()} disabled={createUser.isPending || !form.email || !form.password || !form.full_name}>
                {createUser.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(value) => !value && setEditing(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit user</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full name</Label><Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
            <div><Label>Role</Label><Select value={editForm.role} onValueChange={(role) => setEditForm({ ...editForm, role: role as Role })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Status</Label><Select value={editForm.is_active ? "active" : "inactive"} onValueChange={(v) => setEditForm({ ...editForm, is_active: v === "active" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={() => updateUser.mutate()} disabled={updateUser.isPending || !editForm.full_name || !editForm.email}>Save changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader><CardTitle>Users ({visibleProfiles.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Role</TableHead><TableHead>Change role</TableHead><TableHead>Status & actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleProfiles.map((p: any) => {
                const userRoles = roles?.filter((r) => r.user_id === p.id).map((r) => r.role) ?? [];
                const primaryRole = (userRoles[0] ?? "customer") as Role;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name ?? "—"}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>{p.phone ?? "—"}</TableCell>
                    <TableCell className="space-x-1">{userRoles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}</TableCell>
                    <TableCell>
                      <Select onValueChange={(role) => assignRole.mutate({ userId: p.id, role: role as Role })}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Change..." /></SelectTrigger>
                        <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                      <TableCell className="whitespace-nowrap">
                       <div className="flex flex-nowrap items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(p, primaryRole)}><Pencil className="h-4 w-4 mr-1" />Edit</Button>
                        <Button size="sm" variant={p.is_active ? "outline" : "default"} onClick={() => toggleActive.mutate({ id: p.id, is_active: !p.is_active })}>
                          {p.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        {userRoles.includes("dsa") && (
                          <DsaPayoutSettingsDialog
                            dsaId={p.id}
                            trigger={<Button size="sm" variant="ghost" title="Payout settings"><Wallet className="h-4 w-4" /></Button>}
                          />
                        )}
                        {p.id !== user?.id && <AdminRecordActions archived={!!p.archived_at} label="user" pending={archiveUser.isPending || deleteUser.isPending} onArchive={() => archiveUser.mutate({ id: p.id, archived: !p.archived_at })} onDelete={() => deleteUser.mutate(p.id)} />}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
