"use client";

import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { useApiResource } from "@/lib/useApiResource";
import { StatusPill } from "@/components/StatusPill";
import { Skeleton } from "@/components/ui/skeleton";

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

// Short, human-readable asset profile per hall_type (TECHNICAL_MVP.md §9.2)
// — informational only, not used for any logic.
const HALL_TYPE_BLURB: Record<string, string> = {
  regular: "4 bunk beds, 1 fan, cupboards shared 2-to-1",
  tetfund_danjuma: "2 bunk beds, 4 mattresses, window blinds",
  hall_6: "2 bunk beds, individual tables and chairs",
  hall_7: "Single beds only, no bunks",
};

function HallCard({ hall, rooms }: { hall: Hall; rooms: Room[] }) {
  const perRoomCapacity = rooms[0]?.capacity;

  return (
    <div className="flex flex-col gap-3.5 rounded-[13px] border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="font-heading text-lg font-semibold text-foreground">
          {hall.name}
        </span>
        <StatusPill
          kind={hall.category === "Regular" ? "regular" : "special"}
          label={hall.category}
        />
      </div>

      <p className="text-[13px] leading-[1.5] text-muted-foreground">
        {HALL_TYPE_BLURB[hall.hall_type] ?? "Asset profile not documented"}
      </p>

      <div className="flex items-center gap-4 border-t border-[#ded3c2] pt-3.5 font-mono text-[12.5px] text-muted-foreground">
        <span>
          {rooms.length} room{rooms.length === 1 ? "" : "s"}
        </span>
        {perRoomCapacity !== undefined && (
          <span>Capacity {perRoomCapacity} per room</span>
        )}
      </div>
    </div>
  );
}

function HallsPageContent() {
  const { data: halls, loading, error: loadError } = useApiResource<Hall[]>(
    "/admin/halls",
  );
  const { data: rooms } = useApiResource<Room[]>("/admin/rooms");

  const roomsByHall = new Map<number, Room[]>();
  for (const room of rooms ?? []) {
    const list = roomsByHall.get(room.hall_id) ?? [];
    list.push(room);
    roomsByHall.set(room.hall_id, list);
  }

  return (
    <AppShell title="Halls">
      <div className="flex flex-col gap-4.5">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Halls
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Every hostel hall configured in the system. The set of halls is
            fixed and not editable here.
          </p>
        </div>

        {loading && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-[104px] w-full rounded-[13px]" />
            <Skeleton className="h-[104px] w-full rounded-[13px]" />
            <Skeleton className="h-[104px] w-full rounded-[13px]" />
          </div>
        )}
        {loadError && <p className="text-sm text-destructive">{loadError}</p>}
        {!loading && !loadError && halls?.length === 0 && (
          <p className="text-sm text-muted-foreground">No halls yet.</p>
        )}
        {halls && halls.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {halls.map((hall) => (
              <HallCard
                key={hall.id}
                hall={hall}
                rooms={roomsByHall.get(hall.id) ?? []}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AdminHallsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <HallsPageContent />
    </RoleGuard>
  );
}
