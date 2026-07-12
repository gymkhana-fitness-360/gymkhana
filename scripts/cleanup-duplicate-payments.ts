#!/usr/bin/env tsx
/**
 * DUPLICATE PAYMENT CLEANUP SCRIPT
 * 
 * Finds and reports duplicate payments that slipped through:
 * - Same member
 * - Same day
 * - Amount differs by ≤₹5 (human error typos)
 * 
 * DOES NOT auto-delete - generates report for manual review.
 */

import { prisma } from "../src/lib/prisma";
import { isDuplicateAmount } from "../src/lib/business-rules";

interface DuplicateGroup {
  memberId: string;
  memberName: string;
  date: string;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    receivedAt: Date;
    receivedBy: string;
  }>;
  totalAmount: number;
  suggestion: string;
}

async function findDuplicatePayments() {
  console.log("🔍 Scanning for duplicate payments...\n");

  // Get all payments, grouped by member and date
  const allPayments = await prisma.payment.findMany({
    include: {
      Member: {
        select: {
          id: true,
          name: true,
        },
      },
      User: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { memberId: 'asc' },
      { paymentDate: 'asc' },
      { receivedAt: 'asc' },
    ],
  });

  const duplicateGroups: DuplicateGroup[] = [];
  const processedIds = new Set<string>();

  for (let i = 0; i < allPayments.length; i++) {
    const payment1 = allPayments[i];
    
    if (processedIds.has(payment1.id)) continue;

    const duplicates = [payment1];

    // Check subsequent payments for duplicates
    for (let j = i + 1; j < allPayments.length; j++) {
      const payment2 = allPayments[j];

      // Stop if different member
      if (payment2.memberId !== payment1.memberId) break;

      // Check if same date
      const date1 = payment1.paymentDate?.toDateString() || payment1.receivedAt.toDateString();
      const date2 = payment2.paymentDate?.toDateString() || payment2.receivedAt.toDateString();

      if (date1 !== date2) continue;

      // Check if amounts are within ₹5 (duplicate threshold)
      const amount1 = Number(payment1.amount);
      const amount2 = Number(payment2.amount);

      if (isDuplicateAmount(amount1, amount2)) {
        duplicates.push(payment2);
        processedIds.add(payment2.id);
      }
    }

    // If we found duplicates, add to report
    if (duplicates.length > 1) {
      const totalAmount = duplicates.reduce((sum, p) => sum + Number(p.amount), 0);
      const avgAmount = totalAmount / duplicates.length;

      duplicateGroups.push({
        memberId: payment1.memberId,
        memberName: payment1.Member.name,
        date: payment1.paymentDate?.toLocaleDateString('en-IN') || payment1.receivedAt.toLocaleDateString('en-IN'),
        payments: duplicates.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          method: p.method,
          receivedAt: p.receivedAt,
          receivedBy: p.User.name,
        })),
        totalAmount,
        suggestion: duplicates.length === 2 && Math.abs(Number(duplicates[0].amount) - Number(duplicates[1].amount)) <= 1
          ? `Likely typo: Keep one payment of ₹${Math.round(avgAmount)}`
          : `Possible split payment or duplicate: Review manually`,
      });

      processedIds.add(payment1.id);
    }
  }

  return duplicateGroups;
}

async function main() {
  try {
    const duplicates = await findDuplicatePayments();

    if (duplicates.length === 0) {
      console.log("✅ No duplicate payments found!\n");
      return;
    }

    console.log(`⚠️  Found ${duplicates.length} potential duplicate groups:\n`);

    duplicates.forEach((group, index) => {
      console.log(`\n${index + 1}. ${group.memberName} (${group.memberId}) - ${group.date}`);
      console.log(`   Total: ₹${group.totalAmount}`);
      console.log(`   Suggestion: ${group.suggestion}`);
      console.log(`   Payments:`);
      
      group.payments.forEach((payment, idx) => {
        const timeDiff = idx > 0 
          ? Math.round((payment.receivedAt.getTime() - group.payments[0].receivedAt.getTime()) / 1000 / 60)
          : 0;
        console.log(`     ${idx + 1}. ₹${payment.amount} via ${payment.method} by ${payment.receivedBy}${timeDiff > 0 ? ` (+${timeDiff}min)` : ''}`);
        console.log(`        ID: ${payment.id}`);
      });
    });

    console.log(`\n\n📊 Summary:`);
    console.log(`   Total duplicate groups: ${duplicates.length}`);
    console.log(`   Total duplicate payments: ${duplicates.reduce((sum, g) => sum + g.payments.length, 0)}`);
    console.log(`   Total amount involved: ₹${duplicates.reduce((sum, g) => sum + g.totalAmount, 0)}`);

    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review each group manually`);
    console.log(`   2. For typos (₹700 vs ₹701): Delete one payment via Prisma Studio`);
    console.log(`   3. For split payments (₹400 + ₹300): Mark as intentional, no action needed`);
    console.log(`   4. Run this script again to verify cleanup\n`);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
