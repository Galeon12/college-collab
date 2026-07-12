import airtableDb from './db/airtable.js';

async function checkFields() {
  try {
    const user = await airtableDb.findUserByEmail('api1783871909762@example.com');
    console.log(user);
  } catch (e) {
    console.error(e);
  }
}
checkFields();
