/**
 * PAYMENT WORKFLOW INTEGRATION TESTS
 * 
 * End-to-end tests for complete admission and renewal workflows
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { createAdmission } from "@/lib/services/admission.service";
import { createPayment } from "@/lib/services/payment.service";
import { PaymentMethod, MemberStatus } from "@prisma/client";
import { toDateOnlyIST, addDaysIST } from "@/lib/date-only";
import {
  DEFAULT_DEMO_ACCOUNT_ID,
  DEFAULT_DEMO_GYM_ID,
} from "@/lib/gym-constants";

// Test data helpers
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

describe("Payment Workflow Integration", () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  afterEach(async () => {
    // Cleanup test user
    await prisma.user.delete({
      where: { id: testUser.id },
    }).catch(() => {});
  });

  describe("Complete Admission Flow", () => {
    test("creates member, payment, and membership in one transaction", async () => {
      const phone = `9${Math.random().toString().slice(2, 11)}`;
      
      const admission = await createAdmission({
        gymId: DEFAULT_DEMO_GYM_ID,
        name: "New Member Test",
        phone,
        amount: 800,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date(),
        userId: testUser.id,
      });

      // Verify member created
      expect(admission.member).toBeDefined();
      expect(admission.member.name).toBe("New Member Test");
      expect(admission.member.phone).toBe(phone);

      // Verify payment created
      expect(admission.payment).toBeDefined();
      expect(Number(admission.payment.amount)).toBe(800);
      expect(admission.payment.method).toBe(PaymentMethod.UPI);
      expect(admission.payment.status).toBe("COMPLETED");

      // Verify membership created
      expect(admission.membership).toBeDefined();
      expect(admission.membership).not.toBeNull();

      // Verify member status
      const member = await prisma.member.findUnique({
        where: { id: admission.member.id },
      });
      expect(member!.status).toBe(MemberStatus.ACTIVE);
      expect(member!.lastPaymentDate).toBeDefined();
      expect(member!.nextRenewalDate).toBeDefined();

      // Verify membership dates
      const membership = await prisma.membership.findFirst({
        where: { memberId: admission.member.id },
      });
      expect(membership).toBeDefined();
      expect(membership!.amount).toBe(admission.payment.amount);

      // Cleanup
      await prisma.payment.deleteMany({ where: { memberId: admission.member.id } });
      await prisma.membership.deleteMany({ where: { memberId: admission.member.id } });
      await prisma.member.delete({ where: { id: admission.member.id } });
    });

    test("prevents duplicate phone number", async () => {
      const phone = `9${Math.random().toString().slice(2, 11)}`;
      
      // First admission
      const admission1 = await createAdmission({
        gymId: DEFAULT_DEMO_GYM_ID,
        name: "First Member",
        phone,
        amount: 800,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date(),
        userId: testUser.id,
      });

      // Second admission with same phone should fail
      await expect(
        createAdmission({
          gymId: DEFAULT_DEMO_GYM_ID,
          name: "Second Member",
          phone,
          amount: 800,
          paymentMethod: PaymentMethod.UPI,
          paymentDate: new Date(),
          userId: testUser.id,
        })
      ).rejects.toThrow(/already belongs to/);

      // Cleanup
      await prisma.payment.deleteMany({ where: { memberId: admission1.member.id } });
      await prisma.membership.deleteMany({ where: { memberId: admission1.member.id } });
      await prisma.member.delete({ where: { id: admission1.member.id } });
    });

    test("infers plan from amount", async () => {
      const phone = `9${Math.random().toString().slice(2, 11)}`;
      
      const admission = await createAdmission({
        gymId: DEFAULT_DEMO_GYM_ID,
        name: "Plan Inference Test",
        phone,
        amount: 799,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date(),
        userId: testUser.id,
      });

      // Payment should have inferred plan
      expect(admission.payment.planId).toBeDefined();
      expect(admission.payment.planId).not.toBe("");

      // Cleanup
      await prisma.payment.deleteMany({ where: { memberId: admission.member.id } });
      await prisma.membership.deleteMany({ where: { memberId: admission.member.id } });
      await prisma.member.delete({ where: { id: admission.member.id } });
    });
  });

  describe("Complete Renewal Flow", () => {
    test("extends active membership correctly", async () => {
      const phone = `9${Math.random().toString().slice(2, 11)}`;
      
      // Create initial admission
      const admission = await createAdmission({
        gymId: DEFAULT_DEMO_GYM_ID,
        name: "Renewal Test Member",
        phone,
        amount: 800,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date("2026-04-01"),
        userId: testUser.id,
      });

      const memberId = admission.member.id;

      // Get initial membership
      const initialMembership = await prisma.membership.findFirst({
        where: { memberId },
        orderBy: { endDate: "desc" },
      });

      expect(initialMembership).toBeDefined();
      const initialEndDate = initialMembership!.endDate;

      // Make renewal payment 10 days before expiry
      const renewalDate = addDaysIST(initialEndDate, -10);
      const renewal = await createPayment({
        gymId: DEFAULT_DEMO_GYM_ID,
        memberId,
        amount: 800,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: renewalDate,
        planId: "monthly",
        userId: testUser.id,
      });

      // Verify extension
      expect(renewal.membership).toBeDefined();
      expect(renewal.wasExtended).toBe(true);

      // New membership should start from day after initial end
      const expectedStartDate = addDaysIST(initialEndDate, 1);
      expect(renewal.membership!.startDate.toISOString()).toBe(
        expectedStartDate.toISOString()
      );

      // Cleanup
      await prisma.payment.deleteMany({ where: { memberId } });
      await prisma.membership.deleteMany({ where: { memberId } });
      await prisma.member.delete({ where: { id: memberId } });
    });

    test("starts new period for expired membership", async () => {
      const phone = `9${Math.random().toString().slice(2, 11)}`;
      
      // Create member with expired membership
      const member = await prisma.member.create({
        data: {
          id: `MEM-TEST-${Date.now()}`,
          gymId: DEFAULT_DEMO_GYM_ID,
          name: "Expired Member",
          phone,
          status: MemberStatus.EXPIRED,
          joinDate: new Date("2026-03-01"),
        },
      });

      // Create expired membership
      await prisma.membership.create({
        data: {
          memberId: member.id,
          gymId: DEFAULT_DEMO_GYM_ID,
          planId: "monthly",
          startDate: new Date("2026-03-01"),
          endDate: new Date("2026-03-31"),
          amount: 800,
        },
      });

      // Make payment after expiry
      const paymentDate = new Date("2026-04-10");
      const renewal = await createPayment({
        gymId: DEFAULT_DEMO_GYM_ID,
        memberId: member.id,
        amount: 800,
        paymentMethod: PaymentMethod.UPI,
        paymentDate,
        planId: "monthly",
        userId: testUser.id,
      });

      // Verify new period starts from payment date
      expect(renewal.membership).toBeDefined();
      expect(renewal.wasExtended).toBe(false);
      expect(renewal.membership!.startDate.toISOString()).toBe(
        toDateOnlyIST(paymentDate).toISOString()
      );

      // Verify member reactivated
      const updatedMember = await prisma.member.findUnique({
        where: { id: member.id },
      });
      expect(updatedMember!.status).toBe(MemberStatus.ACTIVE);

      // Cleanup
      await prisma.payment.deleteMany({ where: { memberId: member.id } });
      await prisma.membership.deleteMany({ where: { memberId: member.id } });
      await prisma.member.delete({ where: { id: member.id } });
    });

    test("handles multiple rapid renewals", async () => {
      const phone = `9${Math.random().toString().slice(2, 11)}`;
      
      // Create initial admission
      const admission = await createAdmission({
        gymId: DEFAULT_DEMO_GYM_ID,
        name: "Multiple Renewals Test",
        phone,
        amount: 800,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date("2026-04-01"),
        userId: testUser.id,
      });

      const memberId = admission.member.id;

      // Make 3 rapid renewals
      const renewal1 = await createPayment({
        gymId: DEFAULT_DEMO_GYM_ID,
        memberId,
        amount: 800,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date("2026-04-05"),
        planId: "monthly",
        userId: testUser.id,
      });

      const renewal2 = await createPayment({
        gymId: DEFAULT_DEMO_GYM_ID,
        memberId,
        amount: 800,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date("2026-04-05"),
        planId: "monthly",
        userId: testUser.id,
      });

      const renewal3 = await createPayment({
        gymId: DEFAULT_DEMO_GYM_ID,
        memberId,
        amount: 800,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date("2026-04-05"),
        planId: "monthly",
        userId: testUser.id,
      });

      // All should extend sequentially
      expect(renewal1.wasExtended).toBe(true);
      expect(renewal2.wasExtended).toBe(true);
      expect(renewal3.wasExtended).toBe(true);

      // Verify all memberships created
      const memberships = await prisma.membership.findMany({
        where: { memberId },
        orderBy: { startDate: "asc" },
      });

      expect(memberships.length).toBeGreaterThanOrEqual(4); // Initial + 3 renewals

      // Each should start where previous ended
      for (let i = 1; i < memberships.length; i++) {
        const prev = memberships[i - 1];
        const curr = memberships[i];
        const expectedStart = addDaysIST(prev.endDate, 1);
        expect(curr.startDate.toISOString()).toBe(expectedStart.toISOString());
      }

      // Cleanup
      await prisma.payment.deleteMany({ where: { memberId } });
      await prisma.membership.deleteMany({ where: { memberId } });
      await prisma.member.delete({ where: { id: memberId } });
    });
  });

  describe("Month/Year Field Integration", () => {
    test("populates month/year across admission and renewals", async () => {
      const phone = `9${Math.random().toString().slice(2, 11)}`;
      
      // Admission in March
      const admission = await createAdmission({
        gymId: DEFAULT_DEMO_GYM_ID,
        name: "Month Year Test",
        phone,
        amount: 800,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date("2026-03-15"),
        userId: testUser.id,
      });

      expect(admission.payment.month).toBe(3);
      expect(admission.payment.year).toBe(2026);

      // Renewal in April
      const renewal = await createPayment({
        gymId: DEFAULT_DEMO_GYM_ID,
        memberId: admission.member.id,
        amount: 800,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date("2026-04-20"),
        planId: "monthly",
        userId: testUser.id,
      });

      expect(renewal.payment.month).toBe(4);
      expect(renewal.payment.year).toBe(2026);

      // Verify all payments have month/year
      const allPayments = await prisma.payment.findMany({
        where: { memberId: admission.member.id },
      });

      for (const payment of allPayments) {
        expect(payment.month).toBeDefined();
        expect(payment.month).not.toBeNull();
        expect(payment.year).toBeDefined();
        expect(payment.year).not.toBeNull();
      }

      // Cleanup
      await prisma.payment.deleteMany({ where: { memberId: admission.member.id } });
      await prisma.membership.deleteMany({ where: { memberId: admission.member.id } });
      await prisma.member.delete({ where: { id: admission.member.id } });
    });
  });
});
