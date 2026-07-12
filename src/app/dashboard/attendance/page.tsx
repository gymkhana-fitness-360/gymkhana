'use client';

import { useCallback, useEffect, useState } from 'react';
import { QRAttendance } from '@/components/attendance/qr-attendance';
import { WalkInVisitsPanel } from '@/components/attendance/walk-in-visits-panel';
import { AttendanceHeatmap } from '@/components/analytics/AttendanceHeatmap';
import { ActiveTrialsPanel } from '@/components/trials/ActiveTrialsPanel';
import { OffersPanel } from '@/components/offers/OffersPanel';
import { formatDate } from '@/lib/utils';
import { createLogger } from "@/lib/logger";
import type { FreeTrialVisitDto } from '@/lib/free-trial-visit-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { SelectNative } from '@/components/ui/select-native';
import { LogIn, UserCheck, QrCode, Users } from 'lucide-react';

const logger = createLogger("dashboard-attendance");

interface Member {
  id: string;
  name: string;
  phone: string;
  status: string;
}

interface Attendance {
  id: string;
  checkIn: string;
  checkOut: string | null;
  method: string;
  member: {
    id: string;
    name: string;
    phone: string;
  };
}

export default function AttendancePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([]);
  const [walkInVisits, setWalkInVisits] = useState<FreeTrialVisitDto[]>([]);
  const [loadingWalkIns, setLoadingWalkIns] = useState(true);
  const [loading, setLoading] = useState(true);

  const todayYmd = new Date().toISOString().split('T')[0];

  const fetchWalkInVisits = useCallback(async () => {
    setLoadingWalkIns(true);
    try {
      const response = await fetch(`/api/free-trial-visits?date=${todayYmd}`);
      if (response.ok) {
        const raw = await response.json();
        const payload = raw?.data ?? raw;
        setWalkInVisits(payload.visits ?? []);
      }
    } catch (error) {
      logger.error('Error fetching walk-in visits:', error as Error);
    } finally {
      setLoadingWalkIns(false);
    }
  }, [todayYmd]);

  useEffect(() => {
    fetchMembers();
    fetchTodayAttendance();
    void fetchWalkInVisits();
  }, [fetchWalkInVisits]);

  useEffect(() => {
    if (selectedMemberId) {
      const member = members.find(m => m.id === selectedMemberId);
      setSelectedMember(member || null);
    } else {
      setSelectedMember(null);
    }
  }, [selectedMemberId, members]);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members?status=ACTIVE');
      if (!response.ok) throw new Error('Failed to fetch members');
      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      logger.error('Error fetching members:', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/attendance?date=${today}`);
      if (response.ok) {
        const data = await response.json();
        setTodayAttendance(data.attendance || []);
      }
    } catch (error) {
      logger.error('Error fetching attendance:', error as Error);
    }
  };

  const formatAttendanceDate = (dateString: string) => formatDate(dateString);

  const qrScans = todayAttendance.filter(a => a.method === 'QR_CODE').length;
  const currentlyIn = todayAttendance.filter(a => !a.checkOut).length;

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Attendance Tracking"
        description="QR code–based attendance system"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Check-ins"
          value={String(todayAttendance.length)}
          icon={LogIn}
        />
        <StatCard
          title="Currently In"
          value={String(currentlyIn)}
          icon={UserCheck}
          variant="success"
        />
        <StatCard
          title="QR Code Scans"
          value={String(qrScans)}
          icon={QrCode}
        />
        <StatCard
          title="Active Members"
          value={String(members.length)}
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AttendanceHeatmap />
        <ActiveTrialsPanel />
      </div>

      <OffersPanel />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <label className="mb-2 block text-sm font-medium text-foreground">
                Select member for QR code
              </label>
              <SelectNative
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                disabled={loading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Choose a member…</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} — {member.phone}
                  </option>
                ))}
              </SelectNative>
            </CardContent>
          </Card>

          {selectedMember && (
            <QRAttendance
              memberId={selectedMember.id}
              memberName={selectedMember.name}
            />
          )}

          {!selectedMember && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p className="text-lg font-semibold text-foreground">Select a member</p>
                <p className="mt-1 text-sm">
                  Choose a member from the dropdown above to generate a QR code.
                </p>
              </CardContent>
            </Card>
          )}

          <WalkInVisitsPanel
            visitDate={todayYmd}
            visits={walkInVisits}
            loadingVisits={loadingWalkIns}
            onRecordsChanged={() => void fetchWalkInVisits()}
          />
        </div>

        <div>
          <Card className="lg:sticky lg:top-4">
            <CardHeader>
              <CardTitle className="text-lg">Today&apos;s attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="text-xs font-medium text-muted-foreground">Total check-ins</div>
                <div className="text-2xl font-bold text-foreground">{todayAttendance.length}</div>
              </div>

              <div className="max-h-[600px] space-y-2 overflow-y-auto">
                {todayAttendance.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No attendance records yet
                  </p>
                ) : (
                  todayAttendance.map((attendance) => (
                    <div key={attendance.id} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-foreground">{attendance.member.name}</div>
                          <div className="text-xs text-muted-foreground">{attendance.member.phone}</div>
                        </div>
                        <div className="text-right text-xs">
                          <div className="font-semibold text-green-600 dark:text-green-400">
                            ✓ {formatAttendanceDate(attendance.checkIn)}
                          </div>
                          {attendance.checkOut && (
                            <div className="text-muted-foreground">
                              ← {formatAttendanceDate(attendance.checkOut)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="rounded bg-muted px-2 py-1 text-xs text-foreground">
                          {attendance.method.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
