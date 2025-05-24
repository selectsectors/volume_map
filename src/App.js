import React, { useState, useEffect } from 'react';

const TICKER = 'SPY';
const INTERVALS = [
  '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
  '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'
];

function App() {
  const [volumeData, setVolumeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVolumeData();
  }, []);

  const fetchVolumeData = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 130);
      
      const formatDate = (date) => date.toISOString().split('T')[0];
      
      console.log('Fetching data for date range:', formatDate(startDate), 'to', formatDate(endDate));
      
      const response = await fetch(
        `/api/volume-data/${TICKER}?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`
      );
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Data received:', data);

      if (data.status === 'OK' && data.results) {
        console.log('Processing', data.results.length, 'data points');
        processVolumeData(data.results);
      } else {
        setError('No data received from API: ' + (data.status || 'Unknown error'));
      }
    } catch (err) {
      setError(`Error fetching data: ${err.message}`);
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const processVolumeData = (results) => {
    const dataByDate = {};
    
    results.forEach(bar => {
      const date = new Date(bar.t);
      const dateStr = date.toISOString().split('T')[0];
      
      // Polygon returns timestamps in milliseconds, in Eastern Time
      const hour = date.getHours();
      const minutes = date.getMinutes();
      const totalMinutes = hour * 60 + minutes;
      
      if (totalMinutes >= 570 && totalMinutes < 960) {
        if (!dataByDate[dateStr]) {
          dataByDate[dateStr] = {};
        }
        
        const intervalIndex = Math.floor((totalMinutes - 570) / 30);
        const interval = INTERVALS[intervalIndex];
        
        if (interval) {
          if (!dataByDate[dateStr][interval]) {
            dataByDate[dateStr][interval] = 0;
          }
          dataByDate[dateStr][interval] += bar.v || 0;
        }
      }
    });

    const processedData = Object.entries(dataByDate)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 90)
      .map(([date, volumes]) => {
        const totalVolume = Object.values(volumes).reduce((sum, vol) => sum + vol, 0);
        const percentages = {};
        
        INTERVALS.forEach(interval => {
          if (totalVolume > 0 && volumes[interval]) {
            percentages[interval] = ((volumes[interval] / totalVolume) * 100).toFixed(1);
          } else {
            percentages[interval] = null;
          }
        });
        
        return { date, percentages };
      });

    const averages = [5, 10, 20, 30, 40].map(days => {
      const relevantDays = processedData.slice(0, days);
      const avgPercentages = {};
      
      INTERVALS.forEach(interval => {
        const validValues = relevantDays
          .map(d => d.percentages[interval])
          .filter(v => v !== null)
          .map(v => parseFloat(v));
        
        if (validValues.length > 0) {
          avgPercentages[interval] = (validValues.reduce((sum, v) => sum + v, 0) / validValues.length).toFixed(2);
        } else {
          avgPercentages[interval] = null;
        }
      });
      
      return { date: `${days} Day Avg`, percentages: avgPercentages, isAverage: true };
    });

    const overallAvg = {};
    INTERVALS.forEach(interval => {
      const validValues = processedData
        .map(d => d.percentages[interval])
        .filter(v => v !== null)
        .map(v => parseFloat(v));
      
      if (validValues.length > 0) {
        overallAvg[interval] = (validValues.reduce((sum, v) => sum + v, 0) / validValues.length).toFixed(2);
      } else {
        overallAvg[interval] = null;
      }
    });

    setVolumeData([
      ...averages.reverse(),
      ...processedData,
      { date: 'AVERAGE', percentages: overallAvg, isAverage: true }
    ]);
  };

  const getColorForValue = (value, isAverage = false) => {
    if (value === null) return '#000000';
    
    const val = parseFloat(value);
    
    if (isAverage) {
      if (val >= 12) return '#FDB750';
      if (val >= 9) return '#C89F5F';
      if (val >= 7) return '#9B8B7A';
      if (val >= 5) return '#6B7DB5';
      return '#4A5F8F';
    }
    
    if (val >= 15) return '#F9D662';
    if (val >= 12) return '#E8C652';
    if (val >= 10) return '#C4A968';
    if (val >= 8) return '#9B8B7A';
    if (val >= 6) return '#7B8EBF';
    if (val >= 4) return '#5B6FA5';
    return '#3B508B';
  };

  const cellStyle = (value, isAverage) => ({
    backgroundColor: getColorForValue(value, isAverage),
    color: value === null ? '#FFFFFF' : parseFloat(value) > 10 ? '#000000' : '#FFFFFF',
    padding: '8px',
    border: '1px solid #4a5568',
    textAlign: 'center',
    fontWeight: isAverage ? 'bold' : 'normal'
  });

  const containerStyle = {
    backgroundColor: '#1a202c',
    minHeight: '100vh',
    padding: '16px'
  };

  const tableContainerStyle = {
    backgroundColor: '#2d3748',
    padding: '16px',
    borderRadius: '8px',
    overflowX: 'auto'
  };

  const headerCellStyle = {
    backgroundColor: '#1a202c',
    color: 'white',
    padding: '8px',
    border: '1px solid #4a5568',
    minWidth: '80px',
    textAlign: 'center'
  };

  if (loading) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: '20px' }}>Loading volume data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#f56565', fontSize: '20px' }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', textAlign: 'center', marginBottom: '24px' }}>
          SPY Intraday Volume Seasonality - Past 90 Trading Days
        </h1>
        
        <div style={tableContainerStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...headerCellStyle, textAlign: 'left' }}>Date</th>
                {INTERVALS.map(interval => (
                  <th key={interval} style={headerCellStyle}>{interval}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {volumeData.map((row, index) => (
                <tr key={index}>
                  <td style={{ 
                    color: 'white', 
                    padding: '8px', 
                    border: '1px solid #4a5568',
                    backgroundColor: row.isAverage ? '#2d3748' : 'transparent',
                    fontWeight: row.isAverage ? 'bold' : 'normal'
                  }}>
                    {row.date}
                  </td>
                  {INTERVALS.map(interval => (
                    <td key={interval} style={cellStyle(row.percentages[interval], row.isAverage)}>
                      {row.percentages[interval] || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div style={{ marginTop: '16px', color: 'white', textAlign: 'center', fontSize: '14px' }}>
          <p>Volume Distribution (%) - Each row sums to 100%</p>
        </div>
      </div>
    </div>
  );
}

export default App;