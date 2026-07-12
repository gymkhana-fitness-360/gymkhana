import { PrismaClient } from "@prisma/client";

// Source database (local)
const sourceDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.SOURCE_DATABASE_URL || "postgresql://user:password@localhost:5432/gymkhana",
    },
  },
});

// Target database (production)
const targetDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

async function exportImportData() {
  console.log("🚀 Starting data export/import...\n");

  try {
    // 1. Export Plans
    console.log("1️⃣ Exporting Plans...");
    const plans = await sourceDb.plan.findMany();
    console.log(`   Found ${plans.length} plans`);
    
    if (plans.length > 0) {
      console.log("   Importing plans to production...");
      for (const plan of plans) {
        await targetDb.plan.upsert({
          where: { id: plan.id },
          create: plan,
          update: plan,
        });
      }
      console.log(`   ✅ Imported ${plans.length} plans`);
    }

    // 2. Export Members
    console.log("\n2️⃣ Exporting Members...");
    const members = await sourceDb.member.findMany({
      orderBy: { joinDate: "asc" },
    });
    console.log(`   Found ${members.length} members`);

    if (members.length > 0) {
      console.log("   Importing members to production...");
      let imported = 0;
      for (const member of members) {
        try {
          await targetDb.member.upsert({
            where: { id: member.id },
            create: member,
            update: member,
          });
          imported++;
          if (imported % 50 === 0) {
            console.log(`   Progress: ${imported}/${members.length}`);
          }
        } catch (error) {
          console.error(`   ⚠️  Failed to import ${member.id}: ${error}`);
        }
      }
      console.log(`   ✅ Imported ${imported} members`);
    }

    // 3. Export Memberships
    console.log("\n3️⃣ Exporting Memberships...");
    const memberships = await sourceDb.membership.findMany({
      orderBy: { startDate: "asc" },
    });
    console.log(`   Found ${memberships.length} memberships`);

    if (memberships.length > 0) {
      console.log("   Importing memberships to production...");
      let imported = 0;
      for (const membership of memberships) {
        try {
          await targetDb.membership.create({
            data: membership,
          });
          imported++;
          if (imported % 100 === 0) {
            console.log(`   Progress: ${imported}/${memberships.length}`);
          }
        } catch (error) {
          // Skip duplicates
          if (!error.message?.includes("Unique constraint")) {
            console.error(`   ⚠️  Failed to import membership: ${error}`);
          }
        }
      }
      console.log(`   ✅ Imported ${imported} memberships`);
    }

    // 4. Export Payments
    console.log("\n4️⃣ Exporting Payments...");
    const payments = await sourceDb.payment.findMany({
      orderBy: { receivedAt: "asc" },
    });
    console.log(`   Found ${payments.length} payments`);

    if (payments.length > 0) {
      console.log("   Importing payments to production...");
      let imported = 0;
      for (const payment of payments) {
        try {
          await targetDb.payment.create({
            data: payment,
          });
          imported++;
          if (imported % 100 === 0) {
            console.log(`   Progress: ${imported}/${payments.length}`);
          }
        } catch (error) {
          if (!error.message?.includes("Unique constraint")) {
            console.error(`   ⚠️  Failed to import payment: ${error}`);
          }
        }
      }
      console.log(`   ✅ Imported ${imported} payments`);
    }

    // 5. Export Users
    console.log("\n5️⃣ Exporting Users...");
    const users = await sourceDb.user.findMany();
    console.log(`   Found ${users.length} users`);

    if (users.length > 0) {
      console.log("   Importing users to production...");
      for (const user of users) {
        try {
          await targetDb.user.upsert({
            where: { id: user.id },
            create: user,
            update: user,
          });
        } catch (error) {
          console.error(`   ⚠️  Failed to import user ${user.email}: ${error}`);
        }
      }
      console.log(`   ✅ Imported ${users.length} users`);
    }

    // Summary
    console.log("\n📊 Export/Import Summary:");
    console.log(`   Plans: ${plans.length}`);
    console.log(`   Members: ${members.length}`);
    console.log(`   Memberships: ${memberships.length}`);
    console.log(`   Payments: ${payments.length}`);
    console.log(`   Users: ${users.length}`);

    console.log("\n✅ Data export/import complete!");
  } catch (error) {
    console.error("\n❌ Error during export/import:", error);
    throw error;
  } finally {
    await sourceDb.$disconnect();
    await targetDb.$disconnect();
  }
}

exportImportData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
