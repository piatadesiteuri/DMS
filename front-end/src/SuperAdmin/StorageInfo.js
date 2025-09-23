import React, { useState, useEffect } from 'react';
import { Box, Text, Progress, VStack, HStack, Spinner } from '@chakra-ui/react';
import axios from 'axios';
import { backend } from '../config';
const SuperAdminStorageInfo = () => {
  const [storageInfo, setStorageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStorageInfo = async () => {
      try {
        const response = await axios.get(`${backend}/superadmin/storage-usage`);
        setStorageInfo(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch storage information');
        setLoading(false);
      }
    };

    fetchStorageInfo();
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
        <Text color="red.500">{error}</Text>
      </Box>
    );
  }

  const usedPercentage = (storageInfo.used / storageInfo.total) * 100;

  return (
    <Box p={4}>
      <Text fontSize="2xl" mb={4}>Storage Information</Text>
      <VStack spacing={4} align="stretch">
        <Box>
          <Text mb={2}>Total Storage: {storageInfo.total} GB</Text>
          <Text mb={2}>Used Storage: {storageInfo.used} GB</Text>
          <Text mb={2}>Available Storage: {storageInfo.available} GB</Text>
        </Box>
        <Box>
          <Text mb={2}>Storage Usage</Text>
          <Progress value={usedPercentage} size="lg" colorScheme={usedPercentage > 90 ? 'red' : 'blue'} />
          <Text mt={2} textAlign="right">{usedPercentage.toFixed(2)}% used</Text>
        </Box>
      </VStack>
    </Box>
  );
};

export default SuperAdminStorageInfo; 