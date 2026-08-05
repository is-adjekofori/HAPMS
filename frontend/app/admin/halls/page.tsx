"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { RoleGuard } from "@/components/RoleGuard";
import { AdminShell } from "@/components/AdminShell";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type HallType = "regular" | "tetfund_danjuma" | "hall_6" | "hall_7";

const HALL_TYPE_OPTIONS: { value: HallType; label: string }[] = [
  { value: "regular", label: "Regular (Halls 1–4)" },
  { value: "tetfund_danjuma", label: "TETFUND A–D / Daisy Danjuma" },
  { value: "hall_6", label: "Hall 6" },
  { value: "hall_7", label: "Hall 7" },
];

const HALL_TYPE_LABELS: Record<HallType, string> = Object.fromEntries(
  HALL_TYPE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<HallType, string>;

interface Hall {
  id: number;
  name: string;
  hall_type: HallType;
  category: string;
  created_at: string;
}

function CreateHallDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [hallType, setHallType] = useState<HallType>("regular");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await apiFetch<Hall>("/admin/halls", {
        method: "POST",
        body: { name, hall_type: hallType },
      });
      toast.success(`Hall "${name}" created`);
      setName("");
      setHallType("regular");
      setOpen(false);
      onCreated();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Unable to reach the server.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        Add hall
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Add a hall</DialogTitle>
            <DialogDescription>
              The room category (Regular/Special) is derived automatically from
              the hall type.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hall 3"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hall_type">Hall type</Label>
              <Select
                value={hallType}
                onValueChange={(v) => setHallType((v ?? "regular") as HallType)}
              >
                <SelectTrigger id="hall_type" className="w-full">
                  <SelectValue>
                    {(value: HallType) => HALL_TYPE_LABELS[value] ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {HALL_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add hall"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HallsPageContent() {
  const {
    data: halls,
    loading,
    error: loadError,
    refetch,
  } = useApiResource<Hall[]>("/admin/halls");

  return (
    <AdminShell title="Halls">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Halls</CardTitle>
            <CardDescription>
              Every hostel hall configured in the system.
            </CardDescription>
          </div>
          <CreateHallDialog onCreated={refetch} />
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}
          {loadError && <p className="text-sm text-destructive">{loadError}</p>}
          {!loading && !loadError && halls?.length === 0 && (
            <p className="text-sm text-muted-foreground">No halls yet.</p>
          )}
          {halls && halls.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Hall type</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {halls.map((hall) => (
                  <TableRow key={hall.id}>
                    <TableCell className="font-medium">{hall.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {HALL_TYPE_LABELS[hall.hall_type] ?? hall.hall_type}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          hall.category === "Regular" ? "secondary" : "default"
                        }
                      >
                        {hall.category}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}

export default function AdminHallsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <HallsPageContent />
    </RoleGuard>
  );
}
