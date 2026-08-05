"use client";

import { RoleGuard } from "@/components/RoleGuard";
import { AdminShell } from "@/components/AdminShell";
import { useApiResource } from "@/lib/useApiResource";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BaselineReportItem {
  baseline_id: number;
  room_id: number;
  hall_name: string;
  room_number: string;
  session_id: number;
  session_name: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  shared_confirmed: boolean;
}

interface VerificationReportItem {
  verification_id: number;
  baseline_id: number;
  room_id: number;
  hall_name: string;
  room_number: string;
  session_id: number;
  session_name: string;
  flagged_count: number;
  verified_at: string;
}

function BaselinesTable() {
  const {
    data: rows,
    loading,
    error,
  } = useApiResource<BaselineReportItem[]>("/admin/reports/baselines");

  if (loading)
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!rows || rows.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        No baselines recorded yet.
      </p>
    );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Room</TableHead>
          <TableHead>Session</TableHead>
          <TableHead>Recorded by</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Shared confirmed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.baseline_id}>
            <TableCell className="font-medium">
              {row.hall_name}, Room {row.room_number}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.session_name}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.created_by_name}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(row.created_at).toLocaleString()}
            </TableCell>
            <TableCell>
              <Badge variant={row.shared_confirmed ? "secondary" : "outline"}>
                {row.shared_confirmed ? "Yes" : "No"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function VerificationsTable() {
  const {
    data: rows,
    loading,
    error,
  } = useApiResource<VerificationReportItem[]>("/admin/reports/verifications");

  if (loading)
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!rows || rows.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        No verifications recorded yet.
      </p>
    );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Room</TableHead>
          <TableHead>Session</TableHead>
          <TableHead>Flagged items</TableHead>
          <TableHead>Verified</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.verification_id}>
            <TableCell className="font-medium">
              {row.hall_name}, Room {row.room_number}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.session_name}
            </TableCell>
            <TableCell>
              <Badge variant={row.flagged_count > 0 ? "default" : "secondary"}>
                {row.flagged_count}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(row.verified_at).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ReportsContent() {
  return (
    <AdminShell title="Reports">
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>
            Every baseline and verification recorded across all sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="baselines">
            <TabsList>
              <TabsTrigger value="baselines">Baselines</TabsTrigger>
              <TabsTrigger value="verifications">Verifications</TabsTrigger>
            </TabsList>
            <TabsContent value="baselines">
              <BaselinesTable />
            </TabsContent>
            <TabsContent value="verifications">
              <VerificationsTable />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </AdminShell>
  );
}

export default function ReportsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <ReportsContent />
    </RoleGuard>
  );
}
