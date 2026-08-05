"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { RoleGuard } from "@/components/RoleGuard";
import { AdminShell } from "@/components/AdminShell";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Hall {
  id: number;
  name: string;
}

interface Room {
  id: number;
  hall_id: number;
  room_number: string;
  corner_label: string | null;
  capacity: number;
}

interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

function roomLabel(room: Room, hallsById: Map<number, Hall>): string {
  const hall = hallsById.get(room.hall_id)?.name ?? `Hall #${room.hall_id}`;
  const corner = room.corner_label ? ` (${room.corner_label})` : "";
  return `${hall} / ${room.room_number}${corner}`;
}

function PorterAssignmentsContent() {
  const { data: halls } = useApiResource<Hall[]>("/admin/halls");
  const { data: rooms, loading: roomsLoading } =
    useApiResource<Room[]>("/admin/rooms");
  const { data: users, loading: usersLoading } =
    useApiResource<User[]>("/admin/users");

  const [porterId, setPorterId] = useState<string>("");
  const [selectedRooms, setSelectedRooms] = useState<Set<number>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);
  const [results, setResults] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hallsById = new Map((halls ?? []).map((hall) => [hall.id, hall]));
  const porters = (users ?? []).filter(
    (user) => user.role === "porter" && user.is_active,
  );
  const portersById = new Map(porters.map((p) => [String(p.id), p]));

  function toggleRoom(roomId: number) {
    setSelectedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setResults(null);

    if (!porterId) {
      setFormError("Choose a porter first.");
      return;
    }
    if (selectedRooms.size === 0) {
      setFormError("Select at least one room.");
      return;
    }

    setSubmitting(true);
    const roomIds = Array.from(selectedRooms);
    const outcomes: string[] = [];
    let successCount = 0;
    // The API assigns one room at a time; issue them sequentially so each
    // room's success/failure (e.g. a 409 duplicate) is reported individually.
    for (const roomId of roomIds) {
      const room = (rooms ?? []).find((r) => r.id === roomId);
      const label = room ? roomLabel(room, hallsById) : `Room #${roomId}`;
      try {
        await apiFetch("/admin/porter-assignments", {
          method: "POST",
          body: { porter_id: Number(porterId), room_id: roomId },
        });
        outcomes.push(`✓ ${label}`);
        successCount += 1;
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Unable to reach the server.";
        outcomes.push(`✗ ${label} — ${message}`);
      }
    }
    setResults(outcomes);
    setSelectedRooms(new Set());
    setSubmitting(false);
    if (successCount > 0) {
      toast.success(
        `Assigned ${successCount} room${successCount === 1 ? "" : "s"} to ${portersById.get(porterId)?.full_name ?? "porter"}`,
      );
    }
  }

  return (
    <AdminShell title="Porter Assignments">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Assign rooms to a porter</CardTitle>
          <CardDescription>
            A porter only ever sees and acts on rooms assigned to them here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAssign} className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="porter">Porter</Label>
              <Select
                value={porterId}
                onValueChange={(v) => setPorterId(v ?? "")}
              >
                <SelectTrigger id="porter" className="w-full">
                  <SelectValue placeholder="Select a porter…">
                    {(value: string) => {
                      const p = portersById.get(value);
                      return p
                        ? `${p.full_name} (${p.email})`
                        : "Select a porter…";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {porters.map((porter) => (
                    <SelectItem key={porter.id} value={String(porter.id)}>
                      {porter.full_name} ({porter.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!usersLoading && porters.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No active porters yet — add one on the Users page first.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">
                Rooms ({selectedRooms.size} selected)
              </p>
              {roomsLoading && (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
              {!roomsLoading && rooms?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No rooms yet — add rooms on the Rooms page first.
                </p>
              )}
              {rooms && rooms.length > 0 && (
                <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border p-3">
                  {rooms.map((room) => (
                    <label
                      key={room.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <Checkbox
                        checked={selectedRooms.has(room.id)}
                        onCheckedChange={() => toggleRoom(room.id)}
                      />
                      <span>{roomLabel(room, hallsById)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            {results && (
              <div className="space-y-1 rounded-lg border p-3 text-sm">
                <p className="font-medium">Assignment results</p>
                {results.map((line, i) => (
                  <p
                    key={i}
                    className={
                      line.startsWith("✓")
                        ? "flex items-center gap-1.5 text-green-700 dark:text-green-400"
                        : "flex items-center gap-1.5 text-destructive"
                    }
                  >
                    {line.startsWith("✓") ? (
                      <Check className="size-3.5 shrink-0" />
                    ) : (
                      <X className="size-3.5 shrink-0" />
                    )}
                    {line.slice(2)}
                  </p>
                ))}
              </div>
            )}

            <Button type="submit" disabled={submitting}>
              {submitting ? "Assigning…" : "Assign rooms"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AdminShell>
  );
}

export default function AdminPorterAssignmentsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <PorterAssignmentsContent />
    </RoleGuard>
  );
}
