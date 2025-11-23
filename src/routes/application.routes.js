const express = require('express');
const router = express.Router();
const googleSheetsService = require('../services/googleSheets.service');
const { findTargetSheet } = require('../config/sheets.config');
const { applicationValidationRules, validate } = require('../middleware/validation');

// POST endpoint to submit application
// In your routes file, update the POST endpoint
router.post('/submit', applicationValidationRules(), validate, async (req, res) => {
  try {
    const applicationData = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      desiredCountry: req.body.desiredCountry,
      visaType: req.body.visaType,
      degreeLevel: req.body.degreeLevel || '',
      urgency: req.body.urgency,
      additionalNotes: req.body.additionalNotes || ''
    };

    // Find the target sheet based on visa type and country
    const targetSheet = findTargetSheet(
      applicationData.visaType,
      applicationData.desiredCountry
    );

    if (!targetSheet.id) {
      throw new Error(`Sheet ID not configured for ${targetSheet.name}`);
    }

    console.log(`Sending data to sheet: ${targetSheet.name} (${targetSheet.id})`);

    // No need to call createHeadersIfNeeded separately since appendData now handles it
    // Just append data (which will create headers if needed)
    await googleSheetsService.appendData(targetSheet.id, applicationData);

    res.status(200).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        applicant: applicationData.name,
        targetSheet: targetSheet.name,
        visaType: applicationData.visaType,
        country: applicationData.desiredCountry
      }
    });

  } catch (error) {
    console.error('Error processing application:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit application',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
// GET endpoint to check available countries
router.get('/available-countries', (req, res) => {
  const { sheetsConfig } = require('../config/sheets.config');
  
  const availableCountries = {
    study: [],
    visit: []
  };

  sheetsConfig.study.sheets.forEach(sheet => {
    availableCountries.study.push(...sheet.countries);
  });

  sheetsConfig.visit.sheets.forEach(sheet => {
    availableCountries.visit.push(...sheet.countries);
  });

  res.json({
    success: true,
    data: availableCountries
  });
});

module.exports = router;