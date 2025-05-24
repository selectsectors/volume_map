const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Test endpoint to check what data is available
app.get('/api/test-access', async (req, res) => {
  const tests = [];
  
  try {
    // Test 1: Previous day 30-minute bars
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 5); // 5 days ago to avoid weekend
    const dateStr = yesterday.toISOString().split('T')[0];
    
    try {
      const response = await axios.get(
        `https://api.polygon.io/v2/aggs/ticker/SPY/range/30/minute/${dateStr}/${dateStr}`,
        {
          params: {
            apiKey: process.env.POLYGON_API_KEY,
            adjusted: true,
            sort: 'asc'
          }
        }
      );
      tests.push({
        test: '30-minute bars (5 days ago)',
        status: response.data.status,
        resultsCount: response.data.results ? response.data.results.length : 0
      });
    } catch (e) {
      tests.push({ test: '30-minute bars', error: e.message });
    }
    
    // Test 2: Daily bars
    try {
      const response = await axios.get(
        `https://api.polygon.io/v2/aggs/ticker/SPY/range/1/day/2024-01-01/2024-12-31`,
        {
          params: {
            apiKey: process.env.POLYGON_API_KEY,
            adjusted: true
          }
        }
      );
      tests.push({
        test: 'Daily bars',
        status: response.data.status,
        resultsCount: response.data.results ? response.data.results.length : 0
      });
    } catch (e) {
      tests.push({ test: 'Daily bars', error: e.message });
    }
    
    // Test 3: Hourly bars
    try {
      const response = await axios.get(
        `https://api.polygon.io/v2/aggs/ticker/SPY/range/1/hour/${dateStr}/${dateStr}`,
        {
          params: {
            apiKey: process.env.POLYGON_API_KEY,
            adjusted: true,
            sort: 'asc'
          }
        }
      );
      tests.push({
        test: 'Hourly bars',
        status: response.data.status,
        resultsCount: response.data.results ? response.data.results.length : 0
      });
    } catch (e) {
      tests.push({ test: 'Hourly bars', error: e.message });
    }
    
    res.json({ tests, apiKeyPresent: !!process.env.POLYGON_API_KEY });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Main endpoint with better error handling
app.get('/api/volume-data/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { startDate, endDate } = req.query;
    
    console.log('Fetching data for:', ticker, 'from', startDate, 'to', endDate);
    console.log('API Key present:', !!process.env.POLYGON_API_KEY);
    
    // For Stocks Starter, try to get data from 15+ days ago
    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setDate(adjustedEndDate.getDate() - 15); // 15 days delay for free tier
    const adjustedStartDate = new Date(startDate);
    
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/30/minute/${adjustedStartDate.toISOString().split('T')[0]}/${adjustedEndDate.toISOString().split('T')[0]}`;
    
    console.log('Adjusted URL:', url);
    
    const response = await axios.get(url, {
      params: {
        apiKey: process.env.POLYGON_API_KEY,
        adjusted: true,
        sort: 'asc',
        limit: 50000
      }
    });
    
    console.log('Polygon response:', {
      status: response.data.status,
      resultsCount: response.data.results ? response.data.results.length : 0,
      message: response.data.message
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('API Error details:', {
      message: error.message,
      response: error.response ? error.response.data : 'No response data',
      status: error.response ? error.response.status : 'No status'
    });
    res.status(500).json({ 
      error: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test the API at: http://localhost:${PORT}/api/test-access`);
});