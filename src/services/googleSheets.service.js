const { google } = require('googleapis');
require('dotenv').config();

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.initialize();
  }

  async initialize() {
    try {
      let credentials;
      
      // Check if we have base64 encoded key (for production/Vercel)
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64) {
        const base64Key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
        const jsonKey = Buffer.from(base64Key, 'base64').toString('utf8');
        credentials = JSON.parse(jsonKey);
        console.log('Using base64 encoded credentials');
      } 
      // Fallback to file path (for local development)
      else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const path = require('path');
        const keyPath = path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        credentials = require(keyPath);
        console.log('Using file-based credentials');
      } 
      else {
        throw new Error('No Google service account credentials found');
      }

      // Initialize auth with credentials object
      this.auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('Google Sheets service initialized successfully');
    } catch (error) {
      console.error('Error initializing Google Sheets service:', error);
      throw error;
    }
  }

  async appendData(spreadsheetId, data) {
    try {
      // First ensure headers exist
      await this.createHeadersIfNeeded(spreadsheetId);
      
      // Prepare the row data - now includes otherCountryInterested
      const timestamp = new Date().toISOString();
      const values = [[
        timestamp,
        data.name,
        data.email,
        data.phone,
        data.address,
        data.desiredCountry,
        data.otherCountryInterested || '',
        data.visaType,
        data.degreeLevel || '',
        data.urgency,
        data.additionalNotes || ''
      ]];

      // Append the data to the sheet - use proper range format
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A:J',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values
        }
      });

      console.log(`Data appended successfully: ${response.data.updates.updatedRows} rows added`);
      return response.data;
    } catch (error) {
      console.error('Error appending data to sheet:', error);
      throw error;
    }
  }

  async createHeadersIfNeeded(spreadsheetId) {
    try {
      // Check if headers exist
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sheet1!A:J'
      });

      // If no headers, create them
      if (!response.data.values || response.data.values.length === 0 || response.data.values[0].length === 0) {
        const headers = [[
          'Timestamp',
          'Name',
          'Email',
          'Phone',
          'Address',
          'Desired Country',
          'Other Country Interested',
          'Visa Type',
          'Degree Level',
          'Urgency',
          'Additional Notes'
        ]];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'Sheet1!A:J',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: headers
          }
        });

        console.log('Headers created successfully');
        return true;
      }
      
      // Check if we need to add the new column header (for existing sheets)
      const existingHeaders = response.data.values[0];
      if (existingHeaders.length < 11 || !existingHeaders.includes('Other Country Interested')) {
        // Need to update headers to include new column
        console.log('Updating headers to include new field...');
        
        const newHeaders = [[
          'Timestamp',
          'Name',
          'Email',
          'Phone',
          'Address',
          'Desired Country',
          'Other Country Interested',
          'Visa Type',
          'Degree Level',
          'Urgency',
          'Additional Notes'
        ]];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'Sheet1!A1:K1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: newHeaders
          }
        });

        console.log('Headers updated with new field');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking/creating headers:', error);
      return false;
    }
  }
}

module.exports = new GoogleSheetsService();