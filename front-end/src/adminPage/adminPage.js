import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Flex, 
  useColorModeValue, 
  Heading, 
  Text, 
  SimpleGrid, 
  Stat, 
  StatLabel, 
  StatNumber, 
  StatHelpText, 
  StatArrow,
  Card,
  CardHeader,
  CardBody,
  Icon,
  Progress,
  Badge,
  HStack,
  VStack,
  Button
} from '@chakra-ui/react';
import { 
  FaUsers, 
  FaFileAlt, 
  FaDatabase, 
  FaChartLine,
  FaUpload,
  FaSearch,
  FaBell,
  FaCog
} from 'react-icons/fa';
import { backend } from '../config';

const AdminPage = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDocuments: 0,
    storageUsed: 0,
    storageLimit: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      // Simulate API call - replace with actual API endpoints
      const mockStats = {
        totalUsers: 29,
        totalDocuments: 1247,
        storageUsed: 266.78,
        storageLimit: 21504.00,
        recentActivity: [
          { type: 'user_created', message: 'New user registered', time: '2 hours ago' },
          { type: 'document_uploaded', message: 'Document uploaded by user', time: '4 hours ago' },
          { type: 'storage_upgrade', message: 'Storage upgrade requested', time: '6 hours ago' }
        ]
      };
      
      setStats(mockStats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  const getStoragePercentage = () => {
    return (stats.storageUsed / stats.storageLimit) * 100;
  };

  const getStorageColor = () => {
    const percentage = getStoragePercentage();
    if (percentage > 80) return 'red';
    if (percentage > 60) return 'orange';
    return 'green';
  };

  return (
    <Box minH="100vh" bg={bgColor}>
      <Container maxW="7xl" py={8}>
        {/* Welcome Header */}
        <Box mb={8}>
          <Heading size="lg" color="gray.700" mb={2}>
            Bine ai revenit!
          </Heading>
          <Text color="gray.600" fontSize="lg">
            Iată o privire de ansamblu asupra sistemului de administrare.
          </Text>
        </Box>

        {/* Stats Grid */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
          {/* Total Users */}
          <Card bg={cardBg} shadow="sm" borderRadius="xl">
            <CardBody>
              <Stat>
                <Flex align="center" justify="space-between">
                  <Box>
                    <StatLabel color="gray.600" fontSize="sm">Total Utilizatori</StatLabel>
                    <StatNumber fontSize="3xl" fontWeight="bold" color="blue.600">
                      {stats.totalUsers}
                    </StatNumber>
                    <StatHelpText color="green.500">
                      <StatArrow type="increase" />
                      12% față de luna trecută
                    </StatHelpText>
                  </Box>
                  <Box
                    p={3}
                    bg="blue.100"
                    borderRadius="xl"
                    color="blue.600"
                  >
                    <FaUsers size={24} />
                  </Box>
                </Flex>
              </Stat>
            </CardBody>
          </Card>

          {/* Total Documents */}
          <Card bg={cardBg} shadow="sm" borderRadius="xl">
            <CardBody>
              <Stat>
                <Flex align="center" justify="space-between">
                  <Box>
                    <StatLabel color="gray.600" fontSize="sm">Total Documente</StatLabel>
                    <StatNumber fontSize="3xl" fontWeight="bold" color="purple.600">
                      {stats.totalDocuments.toLocaleString()}
                    </StatNumber>
                    <StatHelpText color="green.500">
                      <StatArrow type="increase" />
                      8% față de luna trecută
                    </StatHelpText>
                  </Box>
                  <Box
                    p={3}
                    bg="purple.100"
                    borderRadius="xl"
                    color="purple.600"
                  >
                    <FaFileAlt size={24} />
                  </Box>
                </Flex>
              </Stat>
            </CardBody>
          </Card>

          {/* Storage Usage */}
          <Card bg={cardBg} shadow="sm" borderRadius="xl">
            <CardBody>
              <Stat>
                <Flex align="center" justify="space-between">
                  <Box>
                    <StatLabel color="gray.600" fontSize="sm">Spațiu Utilizat</StatLabel>
                    <StatNumber fontSize="3xl" fontWeight="bold" color="green.600">
                      {stats.storageUsed.toFixed(1)} MB
                    </StatNumber>
                    <StatHelpText color="gray.500">
                      din {stats.storageLimit.toFixed(0)} MB
                    </StatHelpText>
                  </Box>
                  <Box
                    p={3}
                    bg="green.100"
                    borderRadius="xl"
                    color="green.600"
                  >
                    <FaDatabase size={24} />
                  </Box>
                </Flex>
              </Stat>
            </CardBody>
          </Card>

          {/* System Health */}
          <Card bg={cardBg} shadow="sm" borderRadius="xl">
            <CardBody>
              <Stat>
                <Flex align="center" justify="space-between">
                  <Box>
                    <StatLabel color="gray.600" fontSize="sm">Stare Sistem</StatLabel>
                    <StatNumber fontSize="3xl" fontWeight="bold" color="green.600">
                      Excelentă
                    </StatNumber>
                    <StatHelpText color="green.500">
                      Toate serviciile funcționează
                    </StatHelpText>
                  </Box>
                  <Box
                    p={3}
                    bg="green.100"
                    borderRadius="xl"
                    color="green.600"
                  >
                    <FaChartLine size={24} />
                  </Box>
                </Flex>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Storage Progress */}
        <Card bg={cardBg} shadow="sm" borderRadius="xl" mb={8}>
          <CardHeader>
            <Heading size="md" color="gray.700">Consum spațiu de stocare</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Flex justify="space-between" align="center">
                <Text fontSize="2xl" fontWeight="bold" color="gray.700">
                  {stats.storageUsed.toFixed(2)} MB / {stats.storageLimit.toFixed(2)} MB
                </Text>
                <Badge colorScheme={getStorageColor()} fontSize="md" p={2}>
                  {getStoragePercentage().toFixed(1)}%
                </Badge>
              </Flex>
              <Progress 
                value={getStoragePercentage()} 
                colorScheme={getStorageColor()} 
                size="lg" 
                borderRadius="full"
              />
              <Flex justify="space-between" fontSize="sm" color="gray.600">
                <Text>Folosit: {stats.storageUsed.toFixed(2)} MB</Text>
                <Text>Disponibil: {(stats.storageLimit - stats.storageUsed).toFixed(2)} MB</Text>
              </Flex>
            </VStack>
          </CardBody>
        </Card>

        {/* Quick Actions */}
        <Card bg={cardBg} shadow="sm" borderRadius="xl" mb={8}>
          <CardHeader>
            <Heading size="md" color="gray.700">Acțiuni Rapide</Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
              <Button
                leftIcon={<FaUsers />}
                colorScheme="blue"
                variant="outline"
                size="lg"
                onClick={() => window.location.href = '/admin/users'}
                _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                transition="all 0.2s"
              >
                Manage Users
              </Button>
              <Button
                leftIcon={<FaUpload />}
                colorScheme="green"
                variant="outline"
                size="lg"
                onClick={() => window.location.href = '/admin/upload'}
                _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                transition="all 0.2s"
              >
                Upload Documents
              </Button>
              <Button
                leftIcon={<FaSearch />}
                colorScheme="purple"
                variant="outline"
                size="lg"
                onClick={() => window.location.href = '/admin/search'}
                _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                transition="all 0.2s"
              >
                Search Documents
              </Button>
              <Button
                leftIcon={<FaBell />}
                colorScheme="orange"
                variant="outline"
                size="lg"
                onClick={() => window.location.href = '/admin/notifications'}
                _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                transition="all 0.2s"
              >
                Notifications
              </Button>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Recent Activity */}
        <Card bg={cardBg} shadow="sm" borderRadius="xl">
          <CardHeader>
            <Heading size="md" color="gray.700">Activitate Recentă</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              {stats.recentActivity.map((activity, index) => (
                <Flex
                  key={index}
                  justify="space-between"
                  align="center"
                  p={3}
                  bg="gray.50"
                  borderRadius="lg"
                  _hover={{ bg: 'gray.100' }}
                  transition="all 0.2s"
                >
                  <HStack spacing={3}>
                    <Box
                      p={2}
                      bg={activity.type === 'user_created' ? 'blue.100' : 
                          activity.type === 'document_uploaded' ? 'green.100' : 'orange.100'}
                      borderRadius="md"
                      color={activity.type === 'user_created' ? 'blue.600' : 
                             activity.type === 'document_uploaded' ? 'green.600' : 'orange.600'}
                    >
                      {activity.type === 'user_created' && <FaUsers size={16} />}
                      {activity.type === 'document_uploaded' && <FaFileAlt size={16} />}
                      {activity.type === 'storage_upgrade' && <FaDatabase size={16} />}
                    </Box>
                    <Text color="gray.700" fontWeight="medium">
                      {activity.message}
                    </Text>
                  </HStack>
                  <Text color="gray.500" fontSize="sm">
                    {activity.time}
                  </Text>
                </Flex>
              ))}
            </VStack>
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
};

export default AdminPage;