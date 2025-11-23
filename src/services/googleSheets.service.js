const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.initialize();
  }

  async initialize() {
    try {
      const keyPath = path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      
      this.auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
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
      
      // Prepare the row data
      const timestamp = new Date().toISOString();
      const values = [[
        timestamp,
        data.name,
        data.email,
        data.phone,
        data.address,
        data.desiredCountry,
        data.visaType,
        data.degreeLevel || '',
        data.urgency,
        data.additionalNotes || ''
      ]];

      // Append the data to the sheet
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A:J', // Changed from A:I to A:J (10 columns)
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
        range: 'Sheet1!A1:J1' // Changed from A1:I1 to A1:J1 (10 columns)
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
          'Visa Type',
          'Degree Level',
          'Urgency',
          'Additional Notes'
        ]];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'Sheet1!A1:J1', // Changed from A1:I1 to A1:J1
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: headers
          }
        });

        console.log('Headers created successfully');
        return true;
      } else {
        console.log('Headers already exist');
        return false;
      }
    } catch (error) {
      // If error is because sheet doesn't exist, try to create the sheet first
      if (error.message && error.message.includes('Unable to parse range')) {
        console.log('Sheet might not exist, attempting to write headers anyway...');
        
        const headers = [[
          'Timestamp',
          'Name',
          'Email',
          'Phone',
          'Address',
          'Desired Country',
          'Visa Type',
          'Degree Level',
          'Urgency',
          'Additional Notes'
        ]];

        try {
          await this.sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Sheet1!A1:J1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: headers
            }
          });
          console.log('Headers created successfully on new sheet');
          return true;
        } catch (updateError) {
          console.error('Error creating headers on new sheet:', updateError);
          return false;
        }
      }
      
      console.error('Error checking/creating headers:', error);
      return false;
    }
  }

  // Optional: Add a method to ensure the sheet exists
  async ensureSheetExists(spreadsheetId, sheetName = 'Sheet1') {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties.title'
      });

      const sheetExists = response.data.sheets.some(
        sheet => sheet.properties.title === sheetName
      );

      if (!sheetExists) {
        // Create the sheet if it doesn't exist
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName
                }
              }
            }]
          }
        });
        console.log(`Sheet '${sheetName}' created successfully`);
      }

      return true;
    } catch (error) {
      console.error('Error ensuring sheet exists:', error);
      return false;
    }
  }
}

module.exports = new GoogleSheetsService();