import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Progress,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useColorModeValue,
  SimpleGrid,
  Icon,
  Tooltip,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { FaDatabase, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { backend } from '../config';
const StorageUsage = ({ refreshKey }) => {
  const [storageInfo, setStorageInfo] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [planDetails, setPlanDetails] = useState(null);
  const [isExceeded, setIsExceeded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const progressBg = useColorModeValue('gray.100', 'gray.700');
  const warningColor = useColorModeValue('orange.500', 'orange.300');
  const dangerColor = useColorModeValue('red.500', 'red.300');
  const successColor = useColorModeValue('green.500', 'green.300');

  useEffect(() => {
    const fetchStorageUsage = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${backend}/api/admin/storage-usage`, {
          method: 'GET',
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch storage usage');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setStorageInfo(data.storage);
          setCurrentPlan(data.currentPlan);
          setPlanDetails(data.planDetails);
          setIsExceeded(data.isExceeded);
        } else {
          throw new Error(data.error || 'Failed to fetch storage usage');
        }
      } catch (err) {
        console.error('Error fetching storage usage:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStorageUsage();
    
    // Refresh storage usage every 5 minutes
    const interval = setInterval(fetchStorageUsage, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [refreshKey]);

  // Calculate percentage of storage used based on the current plan
  const calculateUsagePercentage = () => {
    if (!storageInfo || !planDetails) return 0;
    
    const maxStorageMB = planDetails.storageLimitMB;
    const percentage = (storageInfo.totalSizeMB / maxStorageMB) * 100;
    
    return Math.min(percentage, 100); // Cap at 100%
  };

  // Determine status color based on usage percentage
  const getStatusColor = (percentage) => {
    if (percentage >= 90) return dangerColor;
    if (percentage >= 70) return warningColor;
    return successColor;
  };

  const usagePercentage = calculateUsagePercentage();
  const statusColor = getStatusColor(usagePercentage);

  if (loading) {
    return (
      <Box p={6} bg={bgColor} borderRadius="lg" boxShadow="md" borderWidth="1px" borderColor={borderColor}>
        <Text>Loading storage information...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={6} bg={bgColor} borderRadius="lg" boxShadow="md" borderWidth="1px" borderColor={borderColor}>
        <Flex align="center" color="red.500">
          <Icon as={FaExclamationTriangle} mr={2} />
          <Text>Error: {error}</Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Box p={6} bg={bgColor} borderRadius="lg" boxShadow="md" borderWidth="1px" borderColor={borderColor}>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">Storage Usage</Heading>
        <Badge colorScheme={statusColor === successColor ? 'green' : statusColor === warningColor ? 'orange' : 'red'} fontSize="md" px={3} py={1} borderRadius="full">
          {currentPlan} Plan
        </Badge>
      </Flex>
      
      <Box mb={6}>
        <Flex justify="space-between" mb={2}>
          <Text fontWeight="medium">Total Storage Used</Text>
          <Text fontWeight="bold" color={statusColor}>
            {storageInfo.totalSizeMB.toFixed(2)} MB
          </Text>
        </Flex>
        
        <Progress 
          value={usagePercentage} 
          size="lg" 
          colorScheme={usagePercentage >= 90 ? 'red' : usagePercentage >= 70 ? 'orange' : 'green'} 
          bg={progressBg}
          borderRadius="md"
        />
        
        <Text fontSize="sm" color={textColor} mt={2}>
          {usagePercentage.toFixed(1)}% of {planDetails.storageLimitMB} MB limit used
        </Text>
      </Box>
      
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Stat>
          <StatLabel>Total Size</StatLabel>
          <StatNumber>{storageInfo.totalSizeMB.toFixed(2)} MB</StatNumber>
          <StatHelpText>
            <StatArrow type="increase" />
            {usagePercentage.toFixed(1)}% of limit
          </StatHelpText>
        </Stat>
        
        <Stat>
          <StatLabel>Storage Limit</StatLabel>
          <StatNumber>
            <Icon as={FaDatabase} color={statusColor} mr={2} />
            {planDetails.storageLimitMB} MB
          </StatNumber>
          <StatHelpText>
            {isExceeded ? 'Storage limit exceeded' : 
             usagePercentage >= 70 ? 'High storage usage' : 
             'Normal storage usage'}
          </StatHelpText>
        </Stat>
        
        <Stat>
          <StatLabel>Available</StatLabel>
          <StatNumber>
            {Math.max(0, planDetails.storageLimitMB - storageInfo.totalSizeMB).toFixed(2)} MB
          </StatNumber>
          <StatHelpText>
            {isExceeded ? 'Storage limit exceeded' : 
             usagePercentage >= 70 ? 'Monitor storage usage' : 
             'Plenty of storage available'}
          </StatHelpText>
        </Stat>
      </SimpleGrid>
      
      {isExceeded && (
        <Alert status="error" mt={4} borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Storage Limit Exceeded!</AlertTitle>
            <AlertDescription>
              You have exceeded your storage limit. Please upgrade your plan or free up space.
            </AlertDescription>
          </Box>
        </Alert>
      )}
      
      {!isExceeded && usagePercentage >= 70 && (
        <Alert status="warning" mt={4} borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>High Storage Usage</AlertTitle>
            <AlertDescription>
              Your storage usage is high ({usagePercentage.toFixed(1)}%). Consider upgrading your plan soon.
            </AlertDescription>
          </Box>
        </Alert>
      )}
    </Box>
  );
};

export default StorageUsage; 