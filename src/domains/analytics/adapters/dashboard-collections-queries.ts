import { prisma } from "@/lib/prisma";
import { todayIST, startOfDayIST, endOfDayIST } from "@/lib/date-only";

export async function getDashboardCollectionStats() {
  const today = todayIST();

  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
  const lastYearMonthStart = new Date(today.getFullYear() - 1, today.getMonth(), 1);
  const lastYearMonthEnd = new Date(today.getFullYear() - 1, today.getMonth() + 1, 0, 23, 59, 59, 999);
  const currentDay = today.getDate();
  const lastMonthSameDay = startOfDayIST(new Date(today.getFullYear(), today.getMonth() - 1, currentDay));
  const lastMonthSameDayEnd = endOfDayIST(lastMonthSameDay);
  const currentMonthUpToToday = endOfDayIST(today);
  const lastMonthUpToSameDay = endOfDayIST(new Date(today.getFullYear(), today.getMonth() - 1, currentDay));

  const completed = { status: "COMPLETED" as const };

  const [
    currentMonthCollection,
    lastMonthCollection,
    lastYearSameMonthCollection,
    currentMonthUpToTodayCollection,
    lastMonthUpToSameDayCollection,
    todayCollection,
    lastMonthSameDayCollection,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { receivedAt: { gte: currentMonthStart, lte: currentMonthEnd }, ...completed },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.payment.aggregate({
      where: { receivedAt: { gte: lastMonthStart, lte: lastMonthEnd }, ...completed },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.payment.aggregate({
      where: { receivedAt: { gte: lastYearMonthStart, lte: lastYearMonthEnd }, ...completed },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.payment.aggregate({
      where: { receivedAt: { gte: currentMonthStart, lte: currentMonthUpToToday }, ...completed },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.payment.aggregate({
      where: { receivedAt: { gte: lastMonthStart, lte: lastMonthUpToSameDay }, ...completed },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.payment.aggregate({
      where: {
        receivedAt: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
        ...completed,
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.payment.aggregate({
      where: { receivedAt: { gte: lastMonthSameDay, lte: lastMonthSameDayEnd }, ...completed },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const dayByDayComparison = [];
  for (let day = 1; day <= currentDay; day++) {
    const currentDayDate = new Date(today.getFullYear(), today.getMonth(), day);
    const currentDayStart = startOfDayIST(currentDayDate);
    const currentDayEnd = endOfDayIST(currentDayDate);
    const lastMonthDayDate = new Date(today.getFullYear(), today.getMonth() - 1, day);
    const lastMonthDayStart = startOfDayIST(lastMonthDayDate);
    const lastMonthDayEnd = endOfDayIST(lastMonthDayDate);

    const [currentDayData, lastMonthDayData] = await Promise.all([
      prisma.payment.aggregate({
        where: { receivedAt: { gte: currentDayStart, lte: currentDayEnd }, ...completed },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.payment.aggregate({
        where: { receivedAt: { gte: lastMonthDayStart, lte: lastMonthDayEnd }, ...completed },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    dayByDayComparison.push({
      day,
      currentMonth: {
        amount: Number(currentDayData._sum.amount || 0),
        count: currentDayData._count.id,
      },
      lastMonth: {
        amount: Number(lastMonthDayData._sum.amount || 0),
        count: lastMonthDayData._count.id,
      },
      difference: Number(currentDayData._sum.amount || 0) - Number(lastMonthDayData._sum.amount || 0),
      percentageChange:
        lastMonthDayData._sum.amount && Number(lastMonthDayData._sum.amount) > 0
          ? ((Number(currentDayData._sum.amount || 0) - Number(lastMonthDayData._sum.amount)) /
              Number(lastMonthDayData._sum.amount)) *
            100
          : 0,
    });
  }

  const currentMonthTotal = Number(currentMonthCollection._sum.amount || 0);
  const lastMonthTotal = Number(lastMonthCollection._sum.amount || 0);
  const lastYearSameMonthTotal = Number(lastYearSameMonthCollection._sum.amount || 0);
  const currentMonthUpToTodayTotal = Number(currentMonthUpToTodayCollection._sum.amount || 0);
  const lastMonthUpToSameDayTotal = Number(lastMonthUpToSameDayCollection._sum.amount || 0);

  return {
    currentMonth: {
      total: currentMonthTotal,
      count: currentMonthCollection._count.id,
      upToToday: {
        total: currentMonthUpToTodayTotal,
        count: currentMonthUpToTodayCollection._count.id,
      },
    },
    lastMonth: {
      total: lastMonthTotal,
      count: lastMonthCollection._count.id,
      upToSameDay: {
        total: lastMonthUpToSameDayTotal,
        count: lastMonthUpToSameDayCollection._count.id,
      },
    },
    lastYearSameMonth: {
      total: lastYearSameMonthTotal,
      count: lastYearSameMonthCollection._count.id,
    },
    today: {
      total: Number(todayCollection._sum.amount || 0),
      count: todayCollection._count.id,
    },
    lastMonthSameDay: {
      total: Number(lastMonthSameDayCollection._sum.amount || 0),
      count: lastMonthSameDayCollection._count.id,
    },
    comparisons: {
      monthOverMonth: {
        current: currentMonthUpToTodayTotal,
        last: lastMonthUpToSameDayTotal,
        difference: currentMonthUpToTodayTotal - lastMonthUpToSameDayTotal,
        percentageChange:
          lastMonthUpToSameDayTotal > 0
            ? ((currentMonthUpToTodayTotal - lastMonthUpToSameDayTotal) / lastMonthUpToSameDayTotal) * 100
            : 0,
      },
      yearOverYear: {
        current: currentMonthUpToTodayTotal,
        last: lastYearSameMonthTotal,
        difference: currentMonthUpToTodayTotal - lastYearSameMonthTotal,
        percentageChange:
          lastYearSameMonthTotal > 0
            ? ((currentMonthUpToTodayTotal - lastYearSameMonthTotal) / lastYearSameMonthTotal) * 100
            : 0,
      },
      dayComparison: {
        today: Number(todayCollection._sum.amount || 0),
        lastMonthSameDay: Number(lastMonthSameDayCollection._sum.amount || 0),
        difference:
          Number(todayCollection._sum.amount || 0) - Number(lastMonthSameDayCollection._sum.amount || 0),
        percentageChange:
          lastMonthSameDayCollection._sum.amount && Number(lastMonthSameDayCollection._sum.amount) > 0
            ? ((Number(todayCollection._sum.amount || 0) - Number(lastMonthSameDayCollection._sum.amount)) /
                Number(lastMonthSameDayCollection._sum.amount)) *
              100
            : 0,
      },
    },
    dayByDay: dayByDayComparison,
  };
}
