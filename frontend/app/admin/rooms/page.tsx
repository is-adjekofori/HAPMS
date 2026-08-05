"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { RoleGuard } from "@/components/RoleGuard";
import { AdminShell } from "@/components/AdminShell";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";
import { Button } from "@/components/ui/button";
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

interface Hall {
  id: number;
  name: string;
  hall_type: string;
  category: string;
  created_at: string;
}

interface Room {
  id: number;
  hall_id: number;
  room_number: string;
  corner_label: string | null;
  capacity: number;
  created_at: string;
}

function CreateRoomDialog({
  halls,
  onCreated,
}: {
  halls: Hall[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [hallId, setHallId] = useState<string>("");
  const [roomNumber, setRoomNumber] = useState("");
  const [cornerLabel, setCornerLabel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hallsById = new Map(halls.map((hall) => [hall.id, hall]));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!hallId) {
      setFormError("Choose a hall first.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch<Room>("/admin/rooms", {
        method: "POST",
        body: {
          hall_id: Number(hallId),
          room_number: roomNumber,
          corner_label: cornerLabel.trim() === "" ? null : cornerLabel.trim(),
        },
      });
      toast.success(`Room "${roomNumber}" created`);
      setHallId("");
      setRoomNumber("");
      setCornerLabel("");
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
        Add room
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Add a room</DialogTitle>
            <DialogDescription>
              Capacity is derived automatically from the hall type.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="hall">Hall</Label>
              <Select value={hallId} onValueChange={(v) => setHallId(v ?? "")}>
                <SelectTrigger id="hall" className="w-full">
                  <SelectValue placeholder="Select a hall…">
                    {(value: string) =>
                      hallsById.get(Number(value))?.name ?? "Select a hall…"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {halls.map((hall) => (
                    <SelectItem key={hall.id} value={String(hall.id)}>
                      {hall.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="room_number">Room number</Label>
              <Input
                id="room_number"
                required
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. 12"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="corner_label">Corner label (Hall 7 only)</Label>
              <Input
                id="corner_label"
                value={cornerLabel}
                onChange={(e) => setCornerLabel(e.target.value)}
                placeholder="e.g. A"
              />
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
              {submitting ? "Adding…" : "Add room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RoomsPageContent() {
  const { data: halls } = useApiResource<Hall[]>("/admin/halls");
  const {
    data: rooms,
    loading,
    error: loadError,
    refetch,
  } = useApiResource<Room[]>("/admin/rooms");

  const hallsById = new Map((halls ?? []).map((hall) => [hall.id, hall]));

  return (
    <AdminShell title="Rooms">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Rooms</CardTitle>
            <CardDescription>
              Every room, scoped to a hall, with its derived capacity.
            </CardDescription>
          </div>
          <CreateRoomDialog halls={halls ?? []} onCreated={refetch} />
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
          {!loading && !loadError && rooms?.length === 0 && (
            <p className="text-sm text-muted-foreground">No rooms yet.</p>
          )}
          {rooms && rooms.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hall</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Corner</TableHead>
                  <TableHead>Capacity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">
                      {hallsById.get(room.hall_id)?.name ?? `#${room.hall_id}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {room.room_number}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {room.corner_label ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {room.capacity}
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

export default function AdminRoomsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <RoomsPageContent />
    </RoleGuard>
  );
}
