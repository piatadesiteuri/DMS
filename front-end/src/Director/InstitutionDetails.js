import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Avatar,
  Button,
  useToast,
  Card,
  CardHeader,
  CardBody,
  Grid,
  GridItem,
  Icon,
  Divider,
  useColorModeValue,
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Select,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Flex,
  Spacer,
  IconButton,
  Tooltip,
  useBreakpointValue,
  ScaleFade,
  Fade,
  SlideFade,
  Center,
  Spinner,
} from '@chakra-ui/react';
import { 
  FaBuilding, 
  FaUser, 
  FaPhone, 
  FaEnvelope, 
  FaMapMarkerAlt, 
  FaPlus, 
  FaDatabase, 
  FaExchangeAlt, 
  FaCheck,
  FaUsers,
  FaCog,
  FaArrowLeft,
  FaChartLine,
  FaInfoCircle,
  FaHistory,
  FaSignInAlt,
  FaSignOutAlt,
  FaUpload,
  FaDownload,
  FaTrash,
  FaEdit,
  FaSync,
  FaArrowRight,
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import AddUserModal from './components/AddUserModal';
import { backend } from '../config';
const MotionBox = motion(Box);

const InstitutionDetails = () => {
  const [institution, setInstitution] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [storageUsage, setStorageUsage] = useState(0);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const logsPerPage = 6;
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const cardBg = useColorModeValue('white', 'gray.700');
  const headingColor = useColorModeValue('gray.800', 'white');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { isOpen, onOpen, onClose } = useDisclosure();

  const fetchInstitutionDetails = async () => {
    try {
      const response = await fetch(`${backend}/api/institutions/${id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch institution details');
      }

      const data = await response.json();
      setInstitution(data.institution);
      setUsers(data.users);

      // Get the current plan for the superadmin
      const superadminResponse = await fetch(`${backend}/post_docs/user/${data.institution.superadmin.id_user}`, {
        credentials: 'include',
        headers: {
          'Origin': window.location.origin
        }
      });

      if (!superadminResponse.ok) {
        throw new Error('Failed to fetch superadmin details');
      }

      const superadminData = await superadminResponse.json();
      
      // If the superadmin has a current plan, fetch its details
      if (superadminData.current_plan_id) {
        const planResponse = await fetch(`${backend}/post_docs/superadmin/plans/${superadminData.current_plan_id}`, {
          credentials: 'include',
          headers: {
            'Origin': window.location.origin
          }
        });

        if (!planResponse.ok) {
          throw new Error('Failed to fetch plan details');
        }

        const planData = await planResponse.json();
        setCurrentPlan(planData.plan);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${backend}/post_docs/superadmin/plans`, {
        credentials: 'include',
        headers: {
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch plans');
      }

      const data = await response.json();
      setPlans(data.plans);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const fetchStorageUsage = async () => {
    try {
      const response = await fetch(`${backend}/post_docs/institutions/${id}/storage`, {
        credentials: 'include',
        headers: {
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch storage usage');
      }

      const data = await response.json();
      setStorageUsage(data.usage);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const fetchLogs = async (page = 1) => {
    try {
      setLogsLoading(true);
      const response = await fetch(`${backend}/post_docs/institutions/${id}/logs?page=${page}&limit=${logsPerPage}`, {
        credentials: 'include',
        headers: {
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      setLogs(data.logs);
      setTotalPages(data.pagination.totalPages);
      setCurrentPage(data.pagination.page);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLogsLoading(false);
    }
  };

  const handlePlanChange = async (planId) => {
    try {
      // Update the superadmin's current plan
      const response = await fetch(`${backend}/post_docs/user/${institution.superadmin.id_user}/plan`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({ plan_id: planId })
      });

      if (!response.ok) {
        throw new Error('Failed to update institution plan');
      }

      // Fetch the updated plan details
      const planResponse = await fetch(`${backend}/post_docs/superadmin/plans/${planId}`, {
        credentials: 'include',
        headers: {
          'Origin': window.location.origin
        }
      });

      if (!planResponse.ok) {
        throw new Error('Failed to fetch updated plan details');
      }

      const planData = await planResponse.json();
      setCurrentPlan(planData.plan);
      
      toast({
        title: 'Success',
        description: 'Plan updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    fetchInstitutionDetails();
    fetchPlans();
    fetchStorageUsage();
    fetchLogs();
  }, [id, toast]);

  const handleUserAdded = () => {
    fetchInstitutionDetails();
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Text>Loading...</Text>
      </Container>
    );
  }

  if (!institution) {
    return (
      <Container maxW="container.xl" py={8}>
        <Text>Institution not found</Text>
      </Container>
    );
  }

  const formatStorage = (bytes, isStorageLimit = false) => {
    // For storage_limit (plan limit), the value is already in MB
    if (isStorageLimit) {
      return bytes.toFixed(2) + ' MB';
    }
    
    // For storage usage, convert bytes to MB
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(2) + ' MB';
  };

  const calculateStoragePercentage = (usedBytes, limitMB) => {
    // Convert used bytes to MB for comparison
    const usedMB = usedBytes / (1024 * 1024);
    return ((usedMB / limitMB) * 100).toFixed(2);
  };

  const getLogIcon = (actionType) => {
    switch (actionType?.toLowerCase()) {
      case 'login':
        return <FaSignInAlt color="green" />;
      case 'logout':
        return <FaSignOutAlt color="red" />;
      case 'upload':
        return <FaUpload color="blue" />;
      case 'download':
        return <FaDownload color="purple" />;
      case 'delete':
        return <FaTrash color="red" />;
      case 'edit':
        return <FaEdit color="orange" />;
      default:
        return <FaInfoCircle color="gray" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Container maxW="container.xl" py={8}>
      <ScaleFade initialScale={0.9} in={true}>
        <VStack spacing={8} align="stretch">
          <Flex align="center" mb={6}>
            <IconButton
              icon={<FaArrowLeft />}
              variant="ghost"
              onClick={() => navigate('/director/users')}
              mr={4}
              aria-label="Go back"
            />
            <Heading size="xl" color={headingColor}>
              {institution.name}
            </Heading>
            <Spacer />
            <Tooltip label="Institution Information">
              <IconButton
                icon={<FaInfoCircle />}
                variant="ghost"
                aria-label="Institution Info"
              />
            </Tooltip>
          </Flex>

          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
            <SlideFade in={true} offsetY={20}>
              <Card bg={cardBg} border="1px" borderColor={borderColor} boxShadow="lg" h="100%">
                <CardHeader>
                  <HStack>
                    <Icon as={FaBuilding} color="blue.500" boxSize={6} />
                    <Heading size="md">Institution Information</Heading>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <HStack>
                      <Icon as={FaMapMarkerAlt} color="green.500" />
                      <Text color={textColor}>{institution.address}</Text>
                    </HStack>
                    <HStack>
                      <Icon as={FaPhone} color="purple.500" />
                      <Text color={textColor}>{institution.phone}</Text>
                    </HStack>
                    <HStack>
                      <Icon as={FaEnvelope} color="red.500" />
                      <Text color={textColor}>{institution.email}</Text>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            </SlideFade>

            <SlideFade in={true} offsetY={20} delay={0.2}>
              <Card bg={cardBg} border="1px" borderColor={borderColor} boxShadow="lg" h="100%">
                <CardHeader>
                  <HStack>
                    <Icon as={FaUser} color="blue.500" boxSize={6} />
                    <Heading size="md">Superadmin Information</Heading>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <HStack>
                      <Avatar
                        name={`${institution.superadmin.prenom} ${institution.superadmin.nom}`}
                        size="lg"
                        src={institution.superadmin.avatar}
                      />
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="bold" fontSize="lg">
                          {institution.superadmin.prenom} {institution.superadmin.nom}
                        </Text>
                        <Text color={textColor}>{institution.superadmin.email}</Text>
                      </VStack>
                    </HStack>
                    <HStack>
                      <Icon as={FaPhone} color="purple.500" />
                      <Text color={textColor}>{institution.superadmin.phone_number}</Text>
                    </HStack>
                    <Badge colorScheme="blue" alignSelf="start" px={2} py={1} borderRadius="md">
                      {institution.superadmin.roles}
                    </Badge>
                  </VStack>
                </CardBody>
              </Card>
            </SlideFade>
          </Grid>

          <Tabs variant="enclosed" colorScheme="blue" isLazy>
            <TabList>
              <Tab>
                <HStack>
                  <Icon as={FaUsers} />
                  <Text>Users</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={FaCog} />
                  <Text>Management</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={FaHistory} />
                  <Text>Logs</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <Fade in={true}>
                  <Card bg={cardBg} border="1px" borderColor={borderColor} boxShadow="lg">
                    <CardHeader>
                      <Flex align="center">
                        <Heading size="md">Users</Heading>
                        <Spacer />
                        <Button
                          leftIcon={<FaPlus />}
                          colorScheme="blue"
                          onClick={onOpen}
                          size="sm"
                        >
                          Add User
                        </Button>
                      </Flex>
                    </CardHeader>
                    <CardBody>
                      <Box overflowX="auto">
                        <Table variant="simple">
                          <Thead>
                            <Tr>
                              <Th>User</Th>
                              <Th>Email</Th>
                              <Th>Phone</Th>
                              <Th>Role</Th>
                              <Th>Status</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {users.map((user) => (
                              <Tr key={user.id_user} _hover={{ bg: 'gray.50' }}>
                                <Td>
                                  <HStack>
                                    <Avatar
                                      size="sm"
                                      name={`${user.prenom} ${user.nom}`}
                                      src={user.avatar}
                                    />
                                    <Text>{user.prenom} {user.nom}</Text>
                                  </HStack>
                                </Td>
                                <Td>{user.email}</Td>
                                <Td>{user.phone_number}</Td>
                                <Td>
                                  <Badge colorScheme={user.roles === 'admin' ? 'purple' : 'green'}>
                                    {user.roles}
                                  </Badge>
                                </Td>
                                <Td>
                                  <Badge colorScheme={user.accepted ? 'green' : 'yellow'}>
                                    {user.accepted ? 'Active' : 'Pending'}
                                  </Badge>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    </CardBody>
                  </Card>
                </Fade>
              </TabPanel>

              <TabPanel>
                <Fade in={true}>
                  <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
                    <MotionBox
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Card bg={cardBg} border="1px" borderColor={borderColor} boxShadow="lg">
                        <CardHeader>
                          <HStack justify="space-between">
                            <HStack>
                              <Icon as={FaChartLine} color="blue.500" boxSize={6} />
                              <Heading size="md">Plan Management</Heading>
                            </HStack>
                            <Select
                              placeholder="Change Plan"
                              value={currentPlan?.id || ''}
                              onChange={(e) => handlePlanChange(e.target.value)}
                              size="sm"
                              width="auto"
                              variant="filled"
                            >
                              {plans.map((plan) => (
                                <option key={plan.id} value={plan.id}>
                                  {plan.name} - ${plan.price}/month
                                </option>
                              ))}
                            </Select>
                          </HStack>
                        </CardHeader>
                        <CardBody>
                          <VStack align="stretch" spacing={6}>
                            <Box>
                              <HStack justify="space-between" mb={2}>
                                <Text fontSize="lg" fontWeight="bold" color="blue.500">
                                  {currentPlan?.name || 'No Plan Selected'}
                                </Text>
                                <Badge colorScheme="blue" px={2} py={1} borderRadius="md">
                                  Current Plan
                                </Badge>
                              </HStack>
                              <Divider mb={4} />
                            </Box>

                            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                              <Box>
                                <Stat>
                                  <StatLabel>Storage Limit</StatLabel>
                                  <StatNumber fontSize="xl">
                                    {formatStorage(currentPlan?.storage_limit || 0, true)}
                                  </StatNumber>
                                </Stat>
                              </Box>
                              <Box>
                                <Stat>
                                  <StatLabel>Price</StatLabel>
                                  <StatNumber fontSize="xl">
                                    ${currentPlan?.price || 0}/month
                                  </StatNumber>
                                </Stat>
                              </Box>
                            </Grid>

                            <Box>
                              <Text fontWeight="medium" mb={2}>Plan Details</Text>
                              <VStack align="stretch" spacing={2}>
                                <HStack justify="space-between">
                                  <Text color={textColor}>Max Files</Text>
                                  <Text fontWeight="medium">{currentPlan?.max_files || 'Unlimited'}</Text>
                                </HStack>
                                <HStack justify="space-between">
                                  <Text color={textColor}>Max File Size</Text>
                                  <Text fontWeight="medium">{currentPlan?.max_file_size || 0} MB</Text>
                                </HStack>
                              </VStack>
                            </Box>

                            <Box>
                              <Text fontWeight="medium" mb={2}>Features</Text>
                              <VStack align="stretch" spacing={2}>
                                {currentPlan?.features?.map((feature, index) => (
                                  <HStack key={index}>
                                    <Icon as={FaCheck} color="green.500" />
                                    <Text color={textColor}>{feature}</Text>
                                  </HStack>
                                ))}
                              </VStack>
                            </Box>
                          </VStack>
                        </CardBody>
                      </Card>
                    </MotionBox>

                    <MotionBox
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      <Card bg={cardBg} border="1px" borderColor={borderColor} boxShadow="lg">
                        <CardHeader>
                          <HStack>
                            <Icon as={FaDatabase} color="blue.500" boxSize={6} />
                            <Heading size="md">Storage Usage</Heading>
                          </HStack>
                        </CardHeader>
                        <CardBody>
                          <VStack align="stretch" spacing={6}>
                            <Box>
                              <HStack justify="space-between" mb={2}>
                                <Text fontWeight="medium">Storage Usage</Text>
                                <Text fontWeight="bold" color={calculateStoragePercentage(storageUsage, currentPlan?.storage_limit || 1) > 80 ? 'red.500' : 'blue.500'}>
                                  {formatStorage(storageUsage)} / {formatStorage(currentPlan?.storage_limit || 0, true)}
                                </Text>
                              </HStack>
                              <Progress 
                                value={(storageUsage / (currentPlan?.storage_limit || 1)) * 100} 
                                colorScheme={calculateStoragePercentage(storageUsage, currentPlan?.storage_limit || 1) > 80 ? 'red' : 'blue'} 
                                size="lg"
                                borderRadius="md"
                                hasStripe
                                isAnimated
                              />
                            </Box>

                            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                              <Box>
                                <Stat>
                                  <StatLabel>Used Space</StatLabel>
                                  <StatNumber fontSize="xl">{formatStorage(storageUsage)}</StatNumber>
                                  <StatHelpText>
                                    <StatArrow type="increase" />
                                    {calculateStoragePercentage(storageUsage, currentPlan?.storage_limit || 1)}% of total
                                  </StatHelpText>
                                </Stat>
                              </Box>
                              <Box>
                                <Stat>
                                  <StatLabel>Available Space</StatLabel>
                                  <StatNumber fontSize="xl">
                                    {formatStorage((currentPlan?.storage_limit || 0) - (storageUsage / (1024 * 1024)), true)}
                                  </StatNumber>
                                  <StatHelpText>
                                    <StatArrow type="decrease" />
                                    {100 - parseFloat(calculateStoragePercentage(storageUsage, currentPlan?.storage_limit || 1))}% remaining
                                  </StatHelpText>
                                </Stat>
                              </Box>
                            </Grid>

                            <Box>
                              <Text fontWeight="medium" mb={2}>Storage Details</Text>
                              <VStack align="stretch" spacing={2}>
                                <HStack justify="space-between">
                                  <Text color={textColor}>Total Storage</Text>
                                  <Text fontWeight="medium">{formatStorage(currentPlan?.storage_limit || 0, true)}</Text>
                                </HStack>
                                <HStack justify="space-between">
                                  <Text color={textColor}>Used Storage</Text>
                                  <Text fontWeight="medium">{formatStorage(storageUsage)}</Text>
                                </HStack>
                                <HStack justify="space-between">
                                  <Text color={textColor}>Available Storage</Text>
                                  <Text fontWeight="medium">
                                    {formatStorage((currentPlan?.storage_limit || 0) - (storageUsage / (1024 * 1024)), true)}
                                  </Text>
                                </HStack>
                              </VStack>
                            </Box>
                          </VStack>
                        </CardBody>
                      </Card>
                    </MotionBox>
                  </Grid>
                </Fade>
              </TabPanel>

              <TabPanel>
                <Fade in={true}>
                  <Card bg={cardBg} border="1px" borderColor={borderColor} boxShadow="lg">
                    <CardHeader>
                      <VStack align="stretch" spacing={4}>
                        <HStack justify="space-between">
                          <HStack>
                            <Icon as={FaHistory} color="blue.500" boxSize={6} />
                            <Heading size="md">User Activity Logs</Heading>
                          </HStack>
                          <HStack>
                            <Button
                              leftIcon={<FaSync />}
                              colorScheme="blue"
                              variant="ghost"
                              size="sm"
                              onClick={() => fetchLogs(currentPage)}
                              isLoading={logsLoading}
                            >
                              Refresh
                            </Button>
                          </HStack>
                        </HStack>
                        <HStack justify="space-between" align="center">
                          <Text fontSize="sm" color={textColor}>
                            Showing {logs.length} of {totalPages * logsPerPage} logs
                          </Text>
                          <HStack spacing={2}>
                            <Button
                              size="sm"
                              onClick={() => fetchLogs(currentPage - 1)}
                              isDisabled={currentPage === 1}
                              leftIcon={<FaArrowLeft />}
                            >
                              Previous
                            </Button>
                            <Text fontSize="sm" minW="100px" textAlign="center">
                              Page {currentPage} of {totalPages}
                            </Text>
                            <Button
                              size="sm"
                              onClick={() => fetchLogs(currentPage + 1)}
                              isDisabled={currentPage === totalPages}
                              rightIcon={<FaArrowRight />}
                            >
                              Next
                            </Button>
                          </HStack>
                        </HStack>
                      </VStack>
                    </CardHeader>
                    <CardBody>
                      {logsLoading ? (
                        <Center py={10}>
                          <Spinner size="xl" color="blue.500" />
                        </Center>
                      ) : logs.length === 0 ? (
                        <Center py={10}>
                          <VStack spacing={4}>
                            <Icon as={FaHistory} boxSize={10} color="gray.400" />
                            <Text color={textColor}>No activity logs available</Text>
                          </VStack>
                        </Center>
                      ) : (
                        <Box maxH="500px" overflowY="auto" pr={2}>
                          <VStack spacing={3} align="stretch">
                            {logs.map((log) => (
                              <Card
                                key={log.id}
                                variant="outline"
                                borderColor="gray.200"
                                _hover={{ borderColor: 'blue.200', transform: 'translateY(-2px)', boxShadow: 'md' }}
                                transition="all 0.2s"
                                size="sm"
                                p={2}
                              >
                                <CardBody p={2}>
                                  <HStack spacing={3} align="start">
                                    <Center
                                      bg="blue.50"
                                      p={2}
                                      borderRadius="lg"
                                      boxSize="40px"
                                    >
                                      {getLogIcon(log.action_type)}
                                    </Center>
                                    <VStack align="start" spacing={1} flex={1}>
                                      <HStack justify="space-between" w="full">
                                        <Text fontWeight="bold" fontSize="sm">
                                          {log.user_name}
                                        </Text>
                                        <Badge colorScheme="blue" px={2} py={0.5} borderRadius="md" fontSize="xs">
                                          {formatDate(log.created_at)}
                                        </Badge>
                                      </HStack>
                                      <Text color={textColor} fontSize="sm">
                                        <Badge colorScheme={log.action_type === 'login' ? 'green' : 'blue'} mr={2} fontSize="xs">
                                          {log.action_type}
                                        </Badge>
                                        {log.details}
                                      </Text>
                                    </VStack>
                                  </HStack>
                                </CardBody>
                              </Card>
                            ))}
                          </VStack>
                        </Box>
                      )}
                    </CardBody>
                  </Card>
                </Fade>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </ScaleFade>

      <AddUserModal
        isOpen={isOpen}
        onClose={onClose}
        institutionId={id}
        institutionName={institution.name}
        onUserAdded={handleUserAdded}
      />
    </Container>
  );
};

export default InstitutionDetails; 