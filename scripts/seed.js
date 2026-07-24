require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function seed() {
  const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'SIH Portal Administrator' } = process.env;
  if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Set MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD in .env before running the seed script.');
  if (ADMIN_PASSWORD.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  await mongoose.connect(MONGODB_URI);
  const users = mongoose.connection.collection('users');
  const existing = await users.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) { console.log(`Admin account already exists for ${ADMIN_EMAIL}. No changes made.`); return; }
  const password = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await users.insertOne({
    fullName: ADMIN_NAME, gender: 'Prefer not to say', email: ADMIN_EMAIL.toLowerCase(), mobile: '0000000000',
    department: 'SIH Cell', branch: 'Administration', academicYear: 'N/A', semester: 'N/A', registrationNumber: `ADMIN-${Date.now()}`,
    rollNumber: 'ADMIN', address: 'Aryan Institute of Engineering & Technology', linkedIn: '', github: '', photoUrl: '',
    password, role: 'admin', registrationStatus: 'approved', createdAt: new Date(), updatedAt: new Date()
  });
  console.log(`Created the administrator account for ${ADMIN_EMAIL}.`);
}

seed().catch((error) => { console.error(`Seed failed: ${error.message}`); process.exitCode = 1; }).finally(async () => mongoose.disconnect());
