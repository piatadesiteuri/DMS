import React, { useState, useEffect } from 'react';
import { Box, Grid, Text, Stat, StatLabel, StatNumber, StatHelpText, StatArrow, Spinner, Alert, AlertIcon } from '@chakra-ui/react';
import { api } from '../utils/api';
import { backend } from '../config';
const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      console.log('Dashboard.js: Starting to fetch stats...');
      try {
        console.log('Dashboard.js: Making API request to /superadmin/dashboard-stats');
        const response = await fetch(`${backend}/superadmin/dashboard-stats`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Origin': window.location.origin
          }
        });

        console.log('Dashboard.js: Response status:', response.status);
        console.log('Dashboard.js: Response headers:', response.headers);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Dashboard.js: Error response text:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('Dashboard.js: Received data:', data);
        setStats(data);
        setLoading(false);
      } catch (err) {
        console.error('Dashboard.js: Error in fetchStats:', err);
        setError(`Failed to fetch dashboard statistics: ${err.message}`);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="200px">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Text fontSize="2xl" mb={4}>SuperAdmin Dashboard</Text>
      <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
        {stats && Object.entries(stats).map(([key, value]) => (
          <Stat key={key} p={4} bg="white" borderRadius="lg" boxShadow="sm">
            <StatLabel>{key}</StatLabel>
            <StatNumber>{value}</StatNumber>
          </Stat>
        ))}
      </Grid>
    </Box>
  );
};

export default SuperAdminDashboard; 