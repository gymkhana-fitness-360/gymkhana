'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLogger } from "@/lib/logger";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { SelectNative } from "@/components/ui/select-native";
import { Dumbbell, Clock, Flame, ListChecks } from "lucide-react";

const logger = createLogger("dashboard-workouts");

interface WorkoutExercise {
  id: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number | null;
  restTime: number | null;
  notes: string | null;
}

interface Workout {
  id: string;
  name: string;
  description: string | null;
  date: string;
  duration: number | null;
  caloriesBurned: number | null;
  notes: string | null;
  exercises: WorkoutExercise[];
  member: {
    id: string;
    name: string;
    phone: string;
  };
}

interface WorkoutStats {
  totalWorkouts: number;
  totalDuration: number;
  totalCalories: number;
  totalExercises: number;
}

export default function WorkoutsPage() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (selectedMemberId) {
      fetchWorkouts();
    }
  }, [selectedMemberId]);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members');
      if (!response.ok) throw new Error('Failed to fetch members');
      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      logger.error('Error fetching members:', error as Error);
    }
  };

  const fetchWorkouts = async () => {
    if (!selectedMemberId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/workouts?memberId=${selectedMemberId}`);
      if (!response.ok) throw new Error('Failed to fetch workouts');
      
      const data = await response.json();
      // API wraps payloads in { success, data }; fall back to raw and guard the array.
      const payload = data?.data ?? data;
      setWorkouts(Array.isArray(payload?.workouts) ? payload.workouts : []);
      setStats(payload?.stats ?? null);
    } catch (error) {
      logger.error('Error fetching workouts:', error as Error);
      alert('Failed to load workouts');
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

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Workout Tracking"
        description="Track member workouts and progress"
      />

      <Card>
        <CardContent className="pt-6">
        <label className="mb-2 block text-sm font-medium">Select member</label>
        <SelectNative
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          className="w-full max-w-xl rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Choose a member...</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name} - {member.phone}
            </option>
          ))}
        </SelectNative>
        </CardContent>
      </Card>

      {selectedMemberId && (
        <>
          {stats && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total workouts"
                value={String(stats.totalWorkouts)}
                icon={Dumbbell}
              />
              <StatCard
                title="Total duration"
                value={formatDuration(stats.totalDuration)}
                icon={Clock}
                variant="success"
              />
              <StatCard
                title="Calories burned"
                value={stats.totalCalories.toLocaleString()}
                icon={Flame}
                variant="warning"
              />
              <StatCard
                title="Total exercises"
                value={String(stats.totalExercises)}
                icon={ListChecks}
              />
            </div>
          )}

          {/* Workouts List */}
          <div className="space-y-4">
            {loading ? (
              <div className="bg-card p-8 rounded-lg shadow text-center text-muted-foreground">
                Loading workouts...
              </div>
            ) : workouts.length === 0 ? (
              <div className="bg-card p-8 rounded-lg shadow text-center text-muted-foreground">
                No workouts found for this member
              </div>
            ) : (
              workouts.map((workout) => (
                <div key={workout.id} className="bg-card p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{workout.name}</h3>
                      <p className="text-sm text-muted-foreground">{formatDate(workout.date)}</p>
                    </div>
                    <div className="text-right">
                      {workout.duration && (
                        <div className="text-sm text-muted-foreground">
                          Duration: <span className="font-semibold">{formatDuration(workout.duration)}</span>
                        </div>
                      )}
                      {workout.caloriesBurned && (
                        <div className="text-sm text-muted-foreground">
                          Calories: <span className="font-semibold">{workout.caloriesBurned}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {workout.description && (
                    <p className="text-foreground mb-4">{workout.description}</p>
                  )}

                  {workout.exercises.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">Exercises</h4>
                      <div className="space-y-2">
                        {workout.exercises.map((exercise) => (
                          <div key={exercise.id} className="flex items-center justify-between bg-muted p-3 rounded">
                            <div>
                              <div className="font-medium">{exercise.exerciseName}</div>
                              {exercise.notes && (
                                <div className="text-sm text-muted-foreground">{exercise.notes}</div>
                              )}
                            </div>
                            <div className="text-right text-sm">
                              <div>
                                {exercise.sets} sets × {exercise.reps} reps
                              </div>
                              {exercise.weight && (
                                <div className="text-muted-foreground">{exercise.weight} kg</div>
                              )}
                              {exercise.restTime && (
                                <div className="text-muted-foreground">Rest: {exercise.restTime}s</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {workout.notes && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded">
                      <div className="text-sm font-medium text-yellow-800">Notes:</div>
                      <div className="text-sm text-yellow-700">{workout.notes}</div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
