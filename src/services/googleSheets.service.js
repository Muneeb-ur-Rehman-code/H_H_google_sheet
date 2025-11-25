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

  // Get the first sheet name from the spreadsheet
  async getFirstSheetName(spreadsheetId) {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties.title'
      });
      
      const sheetName = response.data.sheets[0]?.properties?.title || 'Sheet1';
      console.log(`Found sheet name: ${sheetName}`);
      return sheetName;
    } catch (error) {
      console.error('Error getting sheet name:', error);
      return 'Sheet1'; // fallback
    }
  }

  async appendData(spreadsheetId, data) {
    try {
      // Get the actual sheet name
      const sheetName = await this.getFirstSheetName(spreadsheetId);
      
      // First ensure headers exist and get header mapping
      const headerMapping = await this.createHeadersIfNeeded(spreadsheetId, sheetName);
      
      // Prepare the row data based on header positions
      const timestamp = new Date().toISOString();
      const rowData = new Array(headerMapping.totalColumns).fill('');
      
      // Fill in data at correct column positions
      if (headerMapping.columns['Timestamp'] !== -1) 
        rowData[headerMapping.columns['Timestamp']] = timestamp;
      if (headerMapping.columns['Name'] !== -1) 
        rowData[headerMapping.columns['Name']] = data.name;
      if (headerMapping.columns['Email'] !== -1) 
        rowData[headerMapping.columns['Email']] = data.email;
      if (headerMapping.columns['Phone'] !== -1) 
        rowData[headerMapping.columns['Phone']] = data.phone;
      if (headerMapping.columns['Address'] !== -1) 
        rowData[headerMapping.columns['Address']] = data.address;
      if (headerMapping.columns['Desired Country'] !== -1) 
        rowData[headerMapping.columns['Desired Country']] = data.desiredCountry;
      if (headerMapping.columns['Other Country Interested'] !== -1) 
        rowData[headerMapping.columns['Other Country Interested']] = data.otherCountryInterested || '';
      if (headerMapping.columns['Visa Type'] !== -1) 
        rowData[headerMapping.columns['Visa Type']] = data.visaType;
      if (headerMapping.columns['Degree Level'] !== -1) 
        rowData[headerMapping.columns['Degree Level']] = data.degreeLevel || '';
      if (headerMapping.columns['Urgency'] !== -1) 
        rowData[headerMapping.columns['Urgency']] = data.urgency;
      if (headerMapping.columns['Additional Notes'] !== -1) 
        rowData[headerMapping.columns['Additional Notes']] = data.additionalNotes || '';

      // Append the data to the sheet
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${sheetName}'`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData]
        }
      });

      console.log(`Data appended successfully: ${response.data.updates.updatedRows} rows added`);
      return response.data;
    } catch (error) {
      console.error('Error appending data to sheet:', error);
      throw error;
    }
  }

  async createHeadersIfNeeded(spreadsheetId, sheetName) {
    try {
      // Define our required headers
      const requiredHeaders = [
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
      ];

      // Check if headers exist
      let response;
      try {
        // Get the first row (adjust range to be dynamic)
        response = await this.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `'${sheetName}'!1:1`
        });
      } catch (err) {
        // If range doesn't exist, we need to create headers
        console.log('No existing data found, will create headers');
        response = { data: { values: null } };
      }

      // If no headers exist at all, create all required headers
      if (!response.data.values || response.data.values.length === 0 || response.data.values[0].length === 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${sheetName}'!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [requiredHeaders]
          }
        });

        console.log('All headers created successfully');
        
        // Return mapping of header positions
        const headerMapping = {
          columns: {},
          totalColumns: requiredHeaders.length
        };
        requiredHeaders.forEach((header, index) => {
          headerMapping.columns[header] = index;
        });
        return headerMapping;
      }
      
      // Headers exist, check which ones we need to add
      const existingHeaders = response.data.values[0];
      const missingHeaders = [];
      const headerMapping = {
        columns: {},
        totalColumns: existingHeaders.length
      };
      
      // Create mapping of existing headers
      existingHeaders.forEach((header, index) => {
        // Check if this is one of our required headers
        if (requiredHeaders.includes(header)) {
          headerMapping.columns[header] = index;
        }
      });
      
      // Find missing required headers
      requiredHeaders.forEach(header => {
        if (!existingHeaders.includes(header)) {
          missingHeaders.push(header);
        }
      });
      
      // If we have missing headers, append them to the end
      if (missingHeaders.length > 0) {
        console.log(`Adding missing headers: ${missingHeaders.join(', ')}`);
        
        // Create new header row with existing + missing headers
        const updatedHeaders = [...existingHeaders, ...missingHeaders];
        
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${sheetName}'!1:1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [updatedHeaders]
          }
        });
        
        // Update mapping with new header positions
        missingHeaders.forEach((header, index) => {
          headerMapping.columns[header] = existingHeaders.length + index;
        });
        headerMapping.totalColumns = updatedHeaders.length;
        
        console.log('Missing headers added successfully');
      } else {
        console.log('All required headers already present');
      }
      
      // Fill in any missing mappings with -1 (header not found)
      requiredHeaders.forEach(header => {
        if (!(header in headerMapping.columns)) {
          headerMapping.columns[header] = -1;
        }
      });
      
      return headerMapping;
    } catch (error) {
      console.error('Error checking/creating headers:', error);
      // Return a default mapping in case of error
      const defaultMapping = {
        columns: {},
        totalColumns: 11
      };
      const requiredHeaders = [
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
      ];
      requiredHeaders.forEach((header, index) => {
        defaultMapping.columns[header] = index;
      });
      return defaultMapping;
    }
  }
}

module.exports = new GoogleSheetsService();