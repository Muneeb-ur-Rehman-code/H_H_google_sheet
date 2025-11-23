require('dotenv').config();

const sheetsConfig = {
  visit: {
    sheets: [
      {
        id: process.env.VISIT_H_H,
        name: 'Visa-H_H',
        countries: ['Thailand', ' Malaysia', ' Indonesia', 'Azerbaijan', 'Singapore', 'Hong-Kong', 'Maldives']
      }
    ]
  },
  study: {
    sheets: [
      {
        id: process.env.STUDY_SHEET_Farance,
        name: 'Study_France',
        countries: ['France', 'Sweden', 'Germany', 'Lithuania', 'Cyprus', 'Europe' ]
      },
      {
        id: process.env.STUDY_SHEET_UK,
        name: 'Study-UK',
        countries: ['UK', 'Australia', 'New Zealand','Canada', 'USA']
      },
      {
        id: process.env.STUDY_SHEET_China,
        name: 'Study_China',
        countries: ['Georgia', 'South Korea', 'China', 'Malaysia']
      }
    ]
  }
};

// Function to find the appropriate sheet based on visa type and country
const findTargetSheet = (visaType, country) => {
  const visaConfig = sheetsConfig[visaType.toLowerCase()];
  
  if (!visaConfig) {
    throw new Error(`Invalid visa type: ${visaType}`);
  }
  
  const sheet = visaConfig.sheets.find(sheet => 
    sheet.countries.some(c => 
      c.toLowerCase() === country.toLowerCase()
    )
  );
  
  if (!sheet) {
    throw new Error(`No sheet configured for ${visaType} visa to ${country}`);
  }
  
  return sheet;
};

module.exports = {
  sheetsConfig,
  findTargetSheet
};