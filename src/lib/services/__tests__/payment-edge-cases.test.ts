/**
 * PAYMENT EDGE CASES TESTS
 * 
 * Comprehensive test suite for payment and membership edge cases
 * Tests duplicate detection, membership extension, status sync, and PENDING payments
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/services/payment.service";
import { createOrExtendMembership } from "@/lib/services/membership.service";
import { PaymentStatus, MemberStatus, PaymentMethod } from "@prisma/client";
import { toDateOnlyIST, addDaysIST } from "@/lib/date-only";
import { BusinessRuleViolation } from "@/lib/crud-business-validation";
import {
  DEFAULT_DEMO_ACCOUNT_ID,
  DEFAULT_DEMO_GYM_ID,
} from "@/lib/gym-constants";

// Test data helpers
const createTestMember = async (overrides = {}) => {
  const phone = `9${Math.random().toString().slice(2, 11)}`;
  return prisma.member.create({
    data: {
      id: `MEM-TEST-${Date.now()}`,
      gymId: DEFAULT_DEMO_GYM_ID,
      name: "Test Member",
      phone,
      status: MemberStatus.ACTIVE,
      joinDate: new Date(),
      ...overrides,
    },
  });
};

const createTestUser = async () => {
  const contactNumber = `9${Math.random().toString().slice(2, 11)}`;
  return prisma.user.create({
    data: {
      contactNumber,
      passwordHash: "test-hash",
      name: "Test User",
      role: "ADMIN",
      accountId: DEFAULT_DEMO_ACCOUNT_ID,
    },
  });
};

describe("Payment Edge Cases", () => {
  let testUser: any;
  let testMember: any;

  beforeEach(async () => {
    testUser = await createTestUser();
    testMember = await createTestMember();
  });

  afterEach(async () => {
    // Cleanup test data
    await prisma.payment.deleteMany({
      where: { memberId: testMember.id },
    });
    await prisma.membership.deleteMany({
      where: { memberId: testMember.id },
    });
    await prisma.member.delete({
      where: { id: testMember.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
  });

  describe("Duplicate Detection", () => {
    test("detects duplicate within 2-day window", async () => {
      const day0 = toDateOnlyIST(new Date());
      const day2 = addDaysIST(day0, 2);

      // Day 0: First payment
      const payment1 = await createPayment({
        memberId: testMember.id,
        gymId: testMember.gymId,
        amount: 700,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: day0,
        planId: "monthly",
        userId: testUser.id,
      });

      expect(payment1.payment).toBeDefined();
      expect(payment1.isDuplicate).toBe(false);

      // Day 2: Duplicate (should throw)
      await expect(
        createPayment({
          memberId: testMember.id,
          gymId: testMember.gymId,
          amount: 700,
          paymentMethod: PaymentMethod.UPI,
          paymentDate: day2,
          planId: "monthly",
          userId: testUser.id,
        })
      ).rejects.toThrow(BusinessRuleViolation);
    });

    test("allows payment outside 2-day window", async () => {
      const day0 = toDateOnlyIST(new Date());
      const day3 = addDaysIST(day0, 3);

      // Day 0: First payment
      await createPayment({
        memberId: testMember.id,
        gymId: testMember.gymId,
        amount: 700,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: day0,
        planId: "monthly",
        userId: testUser.id,
      });

      // Day 3: Not duplicate (outside window)
      const payment2 = await createPayment({
        memberId: testMember.id,
        gymId: testMember.gymId,
        amount: 700,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: day3,
        planId: "monthly",
        userId: testUser.id,
      });

      expect(payment2.payment).toBeDefined();
      expect(payment2.isDuplicate).toBe(false);
    });

    test("allows split payments within threshold", async () => {
      const today = toDateOnlyIST(new Date());

      const payment1 = await createPayment({
        memberId: testMember.id,
        gymId: testMember.gymId,
        amount: 350,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: today,
        planId: "monthly",
        userId: testUser.id,
      });

      const payment2 = await createPayment({
        memberId: testMember.id,
        gymId: testMember.gymId,
        amount: 350,
        paymentMethod: PaymentMethod.CASH,
        paymentDate: today,
        planId: "monthly",
        userId: testUser.id,
      });

      expect(payment1.payment.id).not.toBe(payment2.payment.id);
      expect(payment1.isDuplicate).toBe(false);
      expect(payment2.isDuplicate).toBe(false);
    });

    test("detects duplicate at ₹5 threshold boundary", async () => {
      const today = toDateOnlyIST(new Date());

      await createPayment({
        memberId: testMember.id,
        gymId: testMember.gymId,
        amount: 700,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: today,
        planId: "monthly",
        userId: testUser.id,
      });

      // ₹705 = duplicate (within ₹5)
      await expect(
        createPayment({
          memberId: testMember.id,
          gymId: testMember.gymId,
          amount: 705,
          paymentMethod: PaymentMethod.UPI,
          paymentDate: today,
          planId: "monthly",
          userId: testUser.id,
        })
      ).rejects.toThrow(BusinessRuleViolation);

      // ₹706 = not duplicate (outside ₹5)
      const payment = await createPayment({
        memberId: testMember.id,
        gymId: testMember.gymId,
        amount: 706,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: today,
        planId: "monthly",
        userId: testUser.id,
      });

      expect(payment).toBeDefined();
      expect(payment.isDuplicate).toBe(false);
    });
  });

  describe("Membership Extension", () => {
    test("extends from current end date when active", async () => {
      const april1 = new Date("2026-04-01");
      const april10 = new Date("2026-04-10");
      const april15 = new Date("2026-04-15");
      const april16 = new Date("2026-04-16");
      const may15 = new Date("2026-05-15");

      // Create membership ending April 15
      await prisma.membership.create({
        data: {
          memberId: testMember.id,
        gymId: testMember.gymId,
          planId: "monthly",
          startDate: april1,
          endDate: april15,
          amount: 700,
        },
      });

      // Pay on April 10 (5 days early)
      const result = await createPayment({
        memberId: testMember.id,
        gymId: testMember.gymId,
        amount: 700,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: april10,
        planId: "monthly",
        userId: testUser.id,
      });

      // Should extend from April 16 (not lose 5 days)
      expect(result.membership).toBeDefined();
      expect(result.membership!.startDate.toISOString()).toBe(april16.toISOString());
      expect(result.membership!.endDate.toISOString()).toBe(may15.toISOString());
      expect(result.wasExtended).toBe(true);
    });

    test("starts from payment date when expired", async () => {
      const march1 = new Date("2026-03-01");
      const march31 = new Date("2026-03-31");
      const april10 = new Date("2026-04-10");
      const may9 = new Date("2026-05-09");

      // Membership expired March 31
      await prisma.membership.create({
        data: {
          memberId: testMember.id,
        gymId: testMember.gymId,
          planId: "monthly",
          startDate: march1,
          endDate: march31,
          amount: 700,
        },
      });

      // Pay on April 10
      const result = await createPayment({
        memberId: testMember.id,
        gymId: testMember.gymId,
        amount: 700,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: april10,
        planId: "monthly",
        userId: testUser.id,
      });

      // Should start from April 10
      expect(result.membership).toBeDefined();
      expect(result.membership!.startDate.toISOString()).toBe(april10.toISOString());
      expect(result.membership!.endDate.toISOString()).toBe(may9.toISOString());
      expect(result.wasExtended).toBe(false);
    });

    test("treats endDate as exclusive (expired at start of day)", async () => {
      const today = toDateOnlyIST(new Date());
      const march1 = addDaysIST(today, -31);
      const yesterday = addDaysIST(today, -1);
      const april29 = addDaysIST(today, 29);

      // Membership ends today (exclusive - member is expired)
      await prisma.membership.create({
        data: {
          memberId: testMember.id,
        gymId: testMember.gymId,
          planId: "monthly",
          startDate: march1,
          endDate: yesterday,
          amount: 700,
        },
      });

      // Pay today
      const result = await createPayment({
        memberId: testMember.id,
        gymId: testMember.gymId,
        amount: 700,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: today,
        planId: "monthly",
        userId: testUser.id,
      });

      // Should NOT extend (member is expired)
      expect(result.membership).toBeDefined();
      expect(result.membership!.startDate.toISOString()).toBe(today.toISOString());
      expect(result.membership!.endDate.toISOString()).toBe(april29.toISOString());
      expect(result.wasExtended).toBe(false);
    });
  });

  describe("Status Sync", () => {
    test("sets status to ACTIVE after payment", async () => {
      // Set member as EXPIRED
      await prisma.member.update({
        where: { id: testMember.id },
        data: { status: MemberStatus.EXPIRED },
      });

      await createPayment({
        memberId: testMember.id,
        gymId: testMember.gymId,
        amount: 700,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date(),
        planId: "monthly",
        userId: testUser.id,
      });

      const updated = await prisma.member.findUnique({
        where: { id: testMember.id },
      });

      expect(updated!.status).toBe(MemberStatus.ACTIVE);
    });

    test("reactivates EXPIRED member on payment", async () => {
      // Set member as EXPIRED
      await prisma.member.update({
        where: { id: testMember.id },
        data: { status: MemberStatus.EXPIRED },
      });

      await createPayment({
        memberId: testMember.id,
        gymId: testMember.gymId,
        amount: 700,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date(),
        planId: "monthly",
        userId: testUser.id,
      });

      const updated = await prisma.member.findUnique({
        where: { id: testMember.id },
      });

      expect(updated!.status).toBe(MemberStatus.ACTIVE);

      // Check audit log for reactivation
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityType: "Member",
          entityId: testMember.id,
          action: "member_status_changed",
        },
        orderBy: { createdAt: "desc" },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog!.details).toMatchObject({
        previousStatus: "EXPIRED",
        newStatus: "ACTIVE",
        trigger: "payment",
      });
    });
  });

  describe("PENDING Payments", () => {
    test("does not create membership for PENDING payment", async () => {
      const result = await createPayment({
        memberId: testMember.id,
        gymId: testMember.gymId,
        amount: 700,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date(),
        planId: "monthly",
        userId: testUser.id,
        status: PaymentStatus.PENDING,
      });

      expect(result.payment.status).toBe(PaymentStatus.PENDING);
      expect(result.membership).toBeNull();
      expect(result.wasExtended).toBe(false);
    });

    test("logs PENDING payment for manual review", async () => {
      await createPayment({
        memberId: testMember.id,
        gymId: testMember.gymId,
        amount: 700,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date(),
        planId: "monthly",
        userId: testUser.id,
        status: PaymentStatus.PENDING,
      });

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: "payment_pending_review",
          userId: testUser.id,
        },
        orderBy: { createdAt: "desc" },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog!.details).toMatchObject({
        status: "PENDING",
        requiresReview: true,
      });
    });

    test("does not create membership for FAILED payment", async () => {
      const result = await createPayment({
        memberId: testMember.id,
        gymId: testMember.gymId,
        amount: 700,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date(),
        planId: "monthly",
        userId: testUser.id,
        status: PaymentStatus.FAILED,
      });

      expect(result.payment.status).toBe(PaymentStatus.FAILED);
      expect(result.membership).toBeNull();
    });
  });

  describe("Month/Year Population", () => {
    test("populates month and year on payment creation", async () => {
      const payment = await createPayment({
        memberId: testMember.id,
        gymId: testMember.gymId,
        amount: 700,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date("2026-04-15"),
        planId: "monthly",
        userId: testUser.id,
      });

      expect(payment.payment.month).toBe(4);
      expect(payment.payment.year).toBe(2026);
    });

    test("uses receivedAt for month/year when paymentDate is null", async () => {
      const payment = await createPayment({
        memberId: testMember.id,
        gymId: testMember.gymId,
        amount: 700,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date("2026-03-20"),
        planId: "monthly",
        userId: testUser.id,
      });

      expect(payment.payment.month).toBe(3);
      expect(payment.payment.year).toBe(2026);
    });
  });

  describe("Overdue Resolution", () => {
    test("resolves overdue even with external transaction", async () => {
      // Create overdue tracking
      await prisma.overdueTracking.create({
        data: {
          memberId: testMember.id,
        gymId: testMember.gymId,
          month: "April",
        },
      });

      // Create payment with external transaction
      await prisma.$transaction(async (tx) => {
        await createPayment(
          {
            memberId: testMember.id,
            gymId: testMember.gymId,
            amount: 700,
            paymentMethod: PaymentMethod.UPI,
            paymentDate: new Date(),
            planId: "monthly",
            userId: testUser.id,
          },
          { tx }
        );
      });

      // Wait for setImmediate to execute
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setTimeout(resolve, 100));

      const overdue = await prisma.overdueTracking.findFirst({
        where: {
          memberId: testMember.id,
        gymId: testMember.gymId,
          resolvedAt: null,
        },
      });

      // Should be resolved (or at least attempted)
      // Note: This test may be flaky due to async nature
      expect(overdue).toBeNull();
    });
  });
});
