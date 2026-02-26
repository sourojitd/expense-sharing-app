import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...\n');

  // ── Test Users ──────────────────────────────────────────────────────────
  const password = await bcrypt.hash('Password123!', 12);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@splito.dev' },
    update: {},
    create: {
      email: 'alice@splito.dev',
      passwordHash: password,
      name: 'Alice Johnson',
      phone: '+1-555-0101',
      preferredCurrency: 'USD',
      emailVerified: true,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@splito.dev' },
    update: {},
    create: {
      email: 'bob@splito.dev',
      passwordHash: password,
      name: 'Bob Smith',
      phone: '+1-555-0102',
      preferredCurrency: 'USD',
      emailVerified: true,
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@splito.dev' },
    update: {},
    create: {
      email: 'charlie@splito.dev',
      passwordHash: password,
      name: 'Charlie Brown',
      phone: '+1-555-0103',
      preferredCurrency: 'EUR',
      emailVerified: true,
    },
  });

  const diana = await prisma.user.upsert({
    where: { email: 'diana@splito.dev' },
    update: {},
    create: {
      email: 'diana@splito.dev',
      passwordHash: password,
      name: 'Diana Prince',
      phone: '+44-20-7946-0958',
      preferredCurrency: 'GBP',
      emailVerified: true,
    },
  });

  console.log('Created test users:');
  console.log(`  - Alice Johnson  <alice@splito.dev>`);
  console.log(`  - Bob Smith      <bob@splito.dev>`);
  console.log(`  - Charlie Brown  <charlie@splito.dev>`);
  console.log(`  - Diana Prince   <diana@splito.dev>`);
  console.log('  Password for all: Password123!\n');

  // ── Friend Relationships ──────────────────────────────────────────────
  const friendPairs = [
    [alice.id, bob.id],
    [alice.id, charlie.id],
    [alice.id, diana.id],
    [bob.id, charlie.id],
  ];

  for (const [senderId, receiverId] of friendPairs) {
    await prisma.friendRequest.upsert({
      where: { senderId_receiverId: { senderId, receiverId } },
      update: {},
      create: { senderId, receiverId, status: 'ACCEPTED' },
    });
  }

  console.log('Created friend relationships\n');

  // ── Groups ─────────────────────────────────────────────────────────────
  const tripGroup = await prisma.group.create({
    data: {
      name: 'Weekend Trip to NYC',
      description: 'All expenses for our NYC weekend getaway',
      type: 'TRIP',
      createdBy: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'admin' },
          { userId: bob.id, role: 'member' },
          { userId: charlie.id, role: 'member' },
        ],
      },
    },
  });

  const homeGroup = await prisma.group.create({
    data: {
      name: 'Apartment 4B',
      description: 'Shared household expenses',
      type: 'HOME',
      createdBy: bob.id,
      members: {
        create: [
          { userId: bob.id, role: 'admin' },
          { userId: alice.id, role: 'member' },
        ],
      },
    },
  });

  const friendsGroup = await prisma.group.create({
    data: {
      name: 'Friday Dinners',
      description: 'Weekly dinner outings',
      type: 'FRIENDS',
      createdBy: charlie.id,
      members: {
        create: [
          { userId: charlie.id, role: 'admin' },
          { userId: alice.id, role: 'member' },
          { userId: bob.id, role: 'member' },
          { userId: diana.id, role: 'member' },
        ],
      },
    },
  });

  console.log('Created groups:');
  console.log(`  - Weekend Trip to NYC (Trip)`);
  console.log(`  - Apartment 4B (Home)`);
  console.log(`  - Friday Dinners (Friends)\n`);

  // ── Expenses ───────────────────────────────────────────────────────────
  const today = new Date();
  const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000);

  // Trip expenses
  const hotelExpense = await prisma.expense.create({
    data: {
      description: 'Hotel — 2 nights',
      amount: 450.0,
      currency: 'USD',
      date: daysAgo(5),
      paidBy: alice.id,
      groupId: tripGroup.id,
      category: 'accommodation',
      splits: {
        create: [
          { userId: alice.id, amount: 150.0 },
          { userId: bob.id, amount: 150.0 },
          { userId: charlie.id, amount: 150.0 },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      description: 'Uber to airport',
      amount: 65.0,
      currency: 'USD',
      date: daysAgo(5),
      paidBy: bob.id,
      groupId: tripGroup.id,
      category: 'transport',
      splits: {
        create: [
          { userId: alice.id, amount: 21.67 },
          { userId: bob.id, amount: 21.67 },
          { userId: charlie.id, amount: 21.66 },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      description: 'Broadway show tickets',
      amount: 360.0,
      currency: 'USD',
      date: daysAgo(4),
      paidBy: charlie.id,
      groupId: tripGroup.id,
      category: 'entertainment',
      splits: {
        create: [
          { userId: alice.id, amount: 120.0 },
          { userId: bob.id, amount: 120.0 },
          { userId: charlie.id, amount: 120.0 },
        ],
      },
    },
  });

  // Home expenses
  await prisma.expense.create({
    data: {
      description: 'Electricity bill — January',
      amount: 120.0,
      currency: 'USD',
      date: daysAgo(10),
      paidBy: bob.id,
      groupId: homeGroup.id,
      category: 'utilities',
      splits: {
        create: [
          { userId: alice.id, amount: 60.0 },
          { userId: bob.id, amount: 60.0 },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      description: 'Groceries',
      amount: 89.50,
      currency: 'USD',
      date: daysAgo(3),
      paidBy: alice.id,
      groupId: homeGroup.id,
      category: 'food',
      splits: {
        create: [
          { userId: alice.id, amount: 44.75 },
          { userId: bob.id, amount: 44.75 },
        ],
      },
    },
  });

  // Friends group dinner
  await prisma.expense.create({
    data: {
      description: 'Italian restaurant — Friday dinner',
      amount: 220.0,
      currency: 'USD',
      date: daysAgo(2),
      paidBy: diana.id,
      groupId: friendsGroup.id,
      category: 'food',
      splits: {
        create: [
          { userId: alice.id, amount: 55.0 },
          { userId: bob.id, amount: 55.0 },
          { userId: charlie.id, amount: 55.0 },
          { userId: diana.id, amount: 55.0 },
        ],
      },
    },
  });

  console.log('Created sample expenses:');
  console.log('  - Hotel — 2 nights ($450, split 3 ways)');
  console.log('  - Uber to airport ($65, split 3 ways)');
  console.log('  - Broadway show tickets ($360, split 3 ways)');
  console.log('  - Electricity bill ($120, split 2 ways)');
  console.log('  - Groceries ($89.50, split 2 ways)');
  console.log('  - Italian restaurant ($220, split 4 ways)\n');

  // ── Payment ────────────────────────────────────────────────────────────
  await prisma.payment.create({
    data: {
      fromUserId: bob.id,
      toUserId: alice.id,
      amount: 100.0,
      currency: 'USD',
      method: 'venmo',
      status: 'COMPLETED',
      groupId: tripGroup.id,
      note: 'Partial payment for hotel',
      confirmedAt: daysAgo(3),
      settledAt: daysAgo(3),
    },
  });

  console.log('Created sample payment: Bob → Alice $100 (Venmo)\n');

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
