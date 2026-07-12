'use client';

import { useEffect, useState } from 'react';
import { createLogger } from "@/lib/logger";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { cn } from "@/lib/utils";

const logger = createLogger("dashboard-challenges");

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  targetValue: number | null;
  prize: string | null;
  participants: Array<{
    id: string;
    currentValue: number;
    rank: number | null;
    isWinner: boolean;
    member: {
      id: string;
      name: string;
      phone: string;
      photo: string | null;
    };
  }>;
}

interface LeaderboardEntry {
  rank: number;
  member: {
    id: string;
    name: string;
    phone: string;
    photo: string | null;
  };
  value: number;
  label: string;
  totalCalories?: number;
  totalDuration?: number;
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'challenges' | 'leaderboard'>('challenges');
  const [leaderboardType, setLeaderboardType] = useState<'attendance' | 'workouts' | 'challenges'>('attendance');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'week' | 'month' | 'year' | 'all-time'>('month');

  useEffect(() => {
    if (activeTab === 'challenges') {
      fetchChallenges();
    } else {
      fetchLeaderboard();
    }
  }, [activeTab, leaderboardType, leaderboardPeriod]);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/challenges');
      if (!response.ok) throw new Error('Failed to fetch challenges');

      const data = await response.json();
      // The API wraps payloads in { success, data: { challenges } }. Normalize the
      // envelope and the Prisma relation names (ChallengeParticipant/Member) to the
      // shape the UI expects, guarding against undefined so empty data renders cleanly.
      const rawList = data?.data?.challenges ?? data?.challenges ?? [];
      const normalized = (Array.isArray(rawList) ? rawList : []).map((c: any) => ({
        ...c,
        participants: (c.participants ?? c.ChallengeParticipant ?? []).map((p: any) => ({
          ...p,
          member: p.member ?? p.Member,
        })),
      }));
      setChallenges(normalized);
    } catch (error) {
      logger.error('Error fetching challenges:', error as Error);
      alert('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leaderboard?type=${leaderboardType}&period=${leaderboardPeriod}`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      
      const data = await response.json();
      const list = data?.leaderboard ?? data?.data?.leaderboard ?? [];
      setLeaderboard(Array.isArray(list) ? list : []);
    } catch (error) {
      logger.error('Error fetching leaderboard:', error as Error);
      alert('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'UPCOMING':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Challenges & Leaderboard"
        description="Track member engagement and competition"
      />

      <div className="mb-2 flex gap-1 border-b border-border">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setActiveTab('challenges')}
          className={cn(
            "h-auto rounded-none border-b-2 border-transparent px-4 pb-2 pt-0 text-sm font-medium shadow-none hover:bg-transparent",
            activeTab === 'challenges'
              ? "border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Challenges
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setActiveTab('leaderboard')}
          className={cn(
            "h-auto rounded-none border-b-2 border-transparent px-4 pb-2 pt-0 text-sm font-medium shadow-none hover:bg-transparent",
            activeTab === 'leaderboard'
              ? "border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Leaderboard
        </Button>
      </div>

      {activeTab === 'challenges' ? (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-card p-8 rounded-lg shadow text-center text-muted-foreground">
              Loading challenges...
            </div>
          ) : challenges.length === 0 ? (
            <div className="bg-card p-8 rounded-lg shadow text-center text-muted-foreground">
              No challenges found
            </div>
          ) : (
            challenges.map((challenge) => (
              <div key={challenge.id} className="bg-card p-6 rounded-lg shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{challenge.name}</h3>
                    <p className="text-muted-foreground">{challenge.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(challenge.status)}`}>
                    {challenge.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Type</div>
                    <div className="font-semibold">{challenge.type.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Start Date</div>
                    <div className="font-semibold">{formatDate(challenge.startDate)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">End Date</div>
                    <div className="font-semibold">{formatDate(challenge.endDate)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Participants</div>
                    <div className="font-semibold">{challenge.participants.length}</div>
                  </div>
                </div>

                {challenge.targetValue && (
                  <div className="mb-4 p-3 bg-blue-50 rounded">
                    <span className="text-sm font-medium text-blue-800">
                      Target: {challenge.targetValue}
                    </span>
                  </div>
                )}

                {challenge.prize && (
                  <div className="mb-4 p-3 bg-yellow-50 rounded">
                    <span className="text-sm font-medium text-yellow-800">
                      🏆 Prize: {challenge.prize}
                    </span>
                  </div>
                )}

                {challenge.participants.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Top Participants</h4>
                    <div className="space-y-2">
                      {challenge.participants.slice(0, 5).map((participant) => (
                        <div key={participant.id} className="flex items-center justify-between bg-muted p-3 rounded">
                          <div className="flex items-center space-x-3">
                            {participant.rank && (
                              <span className="text-lg font-bold w-8">
                                {getMedalEmoji(participant.rank)}
                              </span>
                            )}
                            <div>
                              <div className="font-medium">{participant.member.name}</div>
                              <div className="text-sm text-muted-foreground">{participant.member.phone}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">{participant.currentValue}</div>
                            {participant.isWinner && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                Winner
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div>
          {/* Leaderboard Filters */}
          <div className="bg-card p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <SelectNative
                  value={leaderboardType}
                  onChange={(e) => setLeaderboardType(e.target.value as any)}
                  className="w-full p-2 border rounded"
                >
                  <option value="attendance">Attendance</option>
                  <option value="workouts">Workouts</option>
                  <option value="challenges">Challenge Wins</option>
                </SelectNative>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Period</label>
                <SelectNative
                  value={leaderboardPeriod}
                  onChange={(e) => setLeaderboardPeriod(e.target.value as any)}
                  className="w-full p-2 border rounded"
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="all-time">All Time</option>
                </SelectNative>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-card rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading leaderboard...</div>
            ) : leaderboard.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No data available</div>
            ) : (
              <div className="divide-y">
                {leaderboard.map((entry) => (
                  <div key={entry.rank} className="p-4 hover:bg-muted flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl font-bold w-12 text-center">
                        {getMedalEmoji(entry.rank)}
                      </div>
                      <div>
                        <div className="font-semibold text-lg">{entry.member.name}</div>
                        <div className="text-sm text-muted-foreground">{entry.member.phone}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {entry.value}
                      </div>
                      <div className="text-sm text-muted-foreground">{entry.label}</div>
                      {entry.totalCalories !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          {entry.totalCalories} cal
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
