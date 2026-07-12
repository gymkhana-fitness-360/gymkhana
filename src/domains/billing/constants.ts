export const WORKOUT_PLANS = {
  GYM: {
    name: "Gym Membership",
    exercises: ["Cardio", "Strength Training", "Flexibility"],
    schedule: "Mon-Sat",
  },
  PERSONAL_TRAINING: {
    name: "Personal Training",
    exercises: ["Customized Workout", "Form Correction", "Nutrition Guidance"],
    schedule: "As per trainer",
  },
  YOGA: {
    name: "Yoga Classes",
    exercises: ["Hatha Yoga", "Vinyasa Flow", "Meditation"],
    schedule: "Tue, Thu, Sat",
  },
  ZUMBA: {
    name: "Zumba Classes",
    exercises: ["Dance Fitness", "Cardio Blast"],
    schedule: "Mon, Wed, Fri",
  },
} as const;
