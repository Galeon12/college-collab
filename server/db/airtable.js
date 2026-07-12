import Airtable from 'airtable';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Airtable base
const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID);

const USERS_TABLE = process.env.AIRTABLE_TABLE_USERS || 'Users';
const APPS_TABLE = process.env.AIRTABLE_TABLE_APPLICATIONS || 'Applications';

/**
 * Escapes single quotes to prevent formula injection when querying by email.
 */
function escapeFormulaValue(value) {
  return value.replace(/'/g, "\\'");
}

// ==========================================
// USERS CRUD
// ==========================================

export const findUserByEmail = async (email) => {
  const safeEmail = escapeFormulaValue(email.toLowerCase());
  try {
    const records = await base(USERS_TABLE).select({
      filterByFormula: `{email} = '${safeEmail}'`,
      maxRecords: 1
    }).firstPage();

    if (records.length === 0) return null;
    
    // Format to match Mongoose schema structure for seamless integration
    return {
      _id: records[0].id,
      ...records[0].fields
    };
  } catch (error) {
    console.error('Airtable findUserByEmail error:', error);
    throw error;
  }
};

export const findUserById = async (id) => {
  try {
    const record = await base(USERS_TABLE).find(id);
    if (!record) return null;
    
    return {
      _id: record.id,
      ...record.fields
    };
  } catch (error) {
    if (error.statusCode === 404) return null;
    console.error('Airtable findUserById error:', error);
    throw error;
  }
};

export const createUser = async (userData) => {
  try {
    // Note: Airtable fields must match the schema exactly.
    const records = await base(USERS_TABLE).create([
      {
        fields: {
          fullName: userData.fullName,
          email: userData.email.toLowerCase(),
          phone: userData.phone,
          isWhatsapp: userData.isWhatsapp || false,
          institution: userData.institution,
          designation: userData.designation,
          password: userData.password
        }
      }
    ]);
    
    return {
      _id: records[0].id,
      ...records[0].fields
    };
  } catch (error) {
    console.error('Airtable createUser error:', error);
    throw error;
  }
};

// ==========================================
// APPLICATIONS CRUD
// ==========================================

export const findApplicationByEmail = async (email) => {
  const safeEmail = escapeFormulaValue(email.toLowerCase());
  try {
    const records = await base(APPS_TABLE).select({
      filterByFormula: `{email} = '${safeEmail}'`,
      maxRecords: 1
    }).firstPage();

    if (records.length === 0) return null;
    
    return {
      _id: records[0].id,
      ...records[0].fields
    };
  } catch (error) {
    console.error('Airtable findApplicationByEmail error:', error);
    throw error;
  }
};

export const createApplication = async (appData) => {
  try {
    const records = await base(APPS_TABLE).create([
      {
        fields: {
          name: appData.name,
          college: appData.college,
          email: appData.email.toLowerCase(),
          phone: appData.phone || '',
          message: appData.message || ''
        }
      }
    ]);
    
    return {
      _id: records[0].id,
      ...records[0].fields
    };
  } catch (error) {
    console.error('Airtable createApplication error:', error);
    throw error;
  }
};

export const getAllApplications = async () => {
  try {
    const records = await base(APPS_TABLE).select({
      sort: [{ field: 'Created time', direction: 'desc' }] // Ensure your Airtable table has this field natively
    }).all();
    
    return records.map(record => ({
      _id: record.id,
      ...record.fields,
      createdAt: record._rawJson.createdTime // Airtable always returns createdTime in raw JSON
    }));
  } catch (error) {
    console.error('Airtable getAllApplications error:', error);
    throw error;
  }
};

export default {
  findUserByEmail,
  findUserById,
  createUser,
  findApplicationByEmail,
  createApplication,
  getAllApplications
};
