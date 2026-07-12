import Airtable from 'airtable';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID);

async function listFields() {
  try {
    const records = await base(process.env.AIRTABLE_TABLE_USERS || 'Users').select({maxRecords: 1}).all();
    console.log(`Fields for first user:`, Object.keys(records[0].fields));
  } catch (e) {
    console.error('Error fetching from Airtable:', e);
  }
}
listFields();
