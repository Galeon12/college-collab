import mongoose from 'mongoose';
import dotenv from 'dotenv';
import airtableDb from '../db/airtable.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

// Temporary Schemas for Migration
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  isWhatsapp: { type: Boolean, default: false },
  institution: { type: String, required: true },
  designation: { type: String, required: true },
  password: { type: String, required: true },
}, { timestamps: true });

const appSchema = new mongoose.Schema({
  name: String,
  college: String,
  email: String,
  phone: String,
  message: String,
}, { timestamps: true });

const TempUser = mongoose.model('User', userSchema);
const TempApp = mongoose.model('Application', appSchema);

async function migrate() {
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Migrate Users
    console.log('--- Migrating Users ---');
    const users = await TempUser.find();
    console.log(`Found ${users.length} users in MongoDB.`);
    
    for (const user of users) {
      const exists = await airtableDb.findUserByEmail(user.email);
      if (!exists) {
        try {
          await airtableDb.createUser({
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            isWhatsapp: user.isWhatsapp,
            institution: user.institution,
            designation: user.designation,
            password: user.password
          });
          console.log(`Migrated user: ${user.email}`);
        } catch (e) {
          console.error(`Failed to migrate user ${user.email}:`, e.message);
        }
      } else {
        console.log(`Skipped user (already exists): ${user.email}`);
      }
      // Airtable rate limits (5 req/sec), so add a small delay
      await new Promise(r => setTimeout(r, 250));
    }

    // 2. Migrate Applications
    console.log('--- Migrating Applications ---');
    const apps = await TempApp.find();
    console.log(`Found ${apps.length} applications in MongoDB.`);
    
    for (const app of apps) {
      const exists = await airtableDb.findApplicationByEmail(app.email);
      if (!exists) {
        try {
          await airtableDb.createApplication({
            name: app.name,
            college: app.college,
            email: app.email,
            phone: app.phone,
            message: app.message
          });
          console.log(`Migrated application: ${app.email}`);
        } catch (e) {
          console.error(`Failed to migrate application ${app.email}:`, e.message);
        }
      } else {
        console.log(`Skipped application (already exists): ${app.email}`);
      }
      await new Promise(r => setTimeout(r, 250));
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
