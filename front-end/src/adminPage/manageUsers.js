import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Select, 
  Heading, 
  Text, 
  Spinner, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  Flex,
  Grid,
  Input,
  Button,
  Checkbox,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Divider,
  useToast,
  Icon,
  Tooltip,
  HStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select as ChakraSelect
} from '@chakra-ui/react';
import { 
  FaUsers, 
  FaHistory, 
  FaSearch, 
  FaFilter, 
  FaTrash, 
  FaDownload, 
  FaUpload, 
  FaUserCheck, 
  FaUserTimes,
  FaClock,
  FaCalendarAlt,
  FaInfoCircle,
  FaChevronLeft,
  FaChevronRight,
  FaUserPlus
} from 'react-icons/fa';
import { backend } from '../config';
const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [actionTypes, setActionTypes] = useState([]);
  const [timeOnlyMode, setTimeOnlyMode] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalLogs, setTotalLogs] = useState(0);
  const [allActionTypes, setAllActionTypes] = useState([]);
  const toast = useToast();

  const handleCreateUser = () => {
    // Navigate to create user page
    window.location.href = '/admin/create-user';
  };

  useEffect(() => {
    fetchUsers();
    // Fetch logs initially when component mounts
    const initialFilters = {
      page: 1,
      limit: pageSize
    };
    fetchLogs(initialFilters);
    
    // Fetch all possible action types
    fetchAllActionTypes();
  }, []);

  useEffect(() => {
    if (logs.length > 0) {
      const uniqueActions = [...new Set(logs.map(log => log.action))];
      setActionTypes(uniqueActions);
    }
  }, [logs]);

  // Add a separate useEffect to handle pageSize changes
  useEffect(() => {
    // This will run when pageSize changes
    const filters = {
      page: 1,
      limit: pageSize
    };
    fetchLogs(filters);
  }, [pageSize]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${backend}/api/admin/users`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      console.log("Fetched users:", data);
      
      if (Array.isArray(data) && data.length > 0) {
        setUsers(data);
      } else {
        console.warn("No users found in response or invalid format");
        setUsers([]);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError(error.message);
      setLoading(false);
      toast({
        title: "Error fetching users",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const fetchLogs = async (filters = {}) => {
    try {
      setLoading(true);
      let url = `${backend}/api/admin/user-logs?`;
      const params = new URLSearchParams();
      
      if (filters.userId) {
        params.append('userId', filters.userId);
      }
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }
      if (filters.action) {
        params.append('action', filters.action);
      }
      if (filters.timeOnly) {
        params.append('timeOnly', 'true');
      }
      if (filters.startTimeOnly) {
        params.append('startTimeOnly', filters.startTimeOnly);
      }
      if (filters.endTimeOnly) {
        params.append('endTimeOnly', filters.endTimeOnly);
      }
      
      // Always include pagination parameters
      params.append('page', filters.page || currentPage);
      params.append('limit', filters.limit || pageSize);
      
      url += params.toString();
      console.log("Fetching logs with URL:", url);
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      const data = await response.json();
      console.log("Fetched logs:", data);
      if (data.success) {
        setLogs(data.logs);
        setTotalLogs(data.total);
        
        // Only show toast for explicit searches, not for pagination or initial load
        // Check if this is a search operation (has search-specific filters)
        const isSearchOperation = 
          filters.userId || 
          filters.startDate || 
          filters.endDate || 
          filters.action || 
          filters.timeOnly || 
          filters.startTimeOnly || 
          filters.endTimeOnly;
        
        if (isSearchOperation) {
          toast({
            title: "Logs retrieved successfully",
            description: `Found ${data.total} logs matching your criteria`,
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        }
      } else {
        console.warn("Failed to fetch logs:", data.error);
        setLogs([]);
        setTotalLogs(0);
        
        // Only show toast for explicit searches, not for pagination or initial load
        const isSearchOperation = 
          filters.userId || 
          filters.startDate || 
          filters.endDate || 
          filters.action || 
          filters.timeOnly || 
          filters.startTimeOnly || 
          filters.endTimeOnly;
        
        if (isSearchOperation) {
          toast({
            title: "No logs found",
            description: "No logs match your current filter criteria",
            status: "info",
            duration: 3000,
            isClosable: true,
          });
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError(error.message);
      setLoading(false);
      toast({
        title: "Error fetching logs",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const fetchAllActionTypes = async () => {
    try {
      const response = await fetch(`${backend}/api/admin/action-types`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch action types');
      }
      const data = await response.json();
      console.log("Fetched action types:", data);
      if (data.success) {
        setAllActionTypes(data.actionTypes);
      } else {
        console.warn("Failed to fetch action types:", data.error);
        setAllActionTypes([]);
      }
    } catch (error) {
      console.error('Error fetching action types:', error);
      setAllActionTypes([]);
    }
  };

  const handleUserChange = (e) => {
    setSelectedUser(e.target.value);
  };

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
  };

  const handleStartTimeChange = (e) => {
    setStartTime(e.target.value);
  };

  const handleEndTimeChange = (e) => {
    setEndTime(e.target.value);
  };

  const handleActionChange = (e) => {
    setSelectedAction(e.target.value);
  };

  const toggleTimeOnlyMode = () => {
    setTimeOnlyMode(!timeOnlyMode);
    // Clear dates when switching to time-only mode
    if (!timeOnlyMode) {
      setStartDate('');
      setEndDate('');
    }
  };

  const toggleFilterExpanded = () => {
    setIsFilterExpanded(!isFilterExpanded);
  };

  const handleSearch = async () => {
    // Reset to first page when searching
    setCurrentPage(1);
    
    const filters = {};
    
    if (selectedUser) {
      filters.userId = selectedUser;
    }
    
    if (timeOnlyMode) {
      // Time-only mode
      filters.timeOnly = true;
      if (startTime) {
        filters.startTimeOnly = startTime;
      }
      if (endTime) {
        filters.endTimeOnly = endTime;
      }
    } else {
      // Date and time mode
      if (startDate) {
        // Combine date and time for start
        const startDateTime = startTime 
          ? `${startDate}T${startTime}:00`
          : `${startDate}T00:00:00`;
        filters.startDate = startDateTime;
      }
      
      if (endDate) {
        // Combine date and time for end
        const endDateTime = endTime 
          ? `${endDate}T${endTime}:00`
          : `${endDate}T23:59:59`;
        filters.endDate = endDateTime;
      }
    }

    if (selectedAction) {
      filters.action = selectedAction;
    }
    
    console.log("Searching with filters:", filters);
    await fetchLogs(filters);
  };

  const handleClear = () => {
    // Reset all filter values
    setSelectedUser('');
    setStartDate('');
    setEndDate('');
    setStartTime('');
    setEndTime('');
    setSelectedAction('');
    setTimeOnlyMode(false);
    
    // Reset to first page
    setCurrentPage(1);
    
    // Fetch logs without any filters
    fetchLogs({});
    
    toast({
      title: "Filters cleared",
      description: "All filters have been reset",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  const handlePageChange = async (page) => {
    // Ensure page is within valid range
    const validPage = Math.max(1, Math.min(page, totalPages));
    
    // Update state
    setCurrentPage(validPage);
    
    // Fetch logs with current filters and new page
    const filters = {
      page: validPage,
      limit: pageSize
    };
    
    if (selectedUser) {
      filters.userId = selectedUser;
    }
    
    if (timeOnlyMode) {
      filters.timeOnly = true;
      if (startTime) {
        filters.startTimeOnly = startTime;
      }
      if (endTime) {
        filters.endTimeOnly = endTime;
      }
    } else {
      if (startDate) {
        const startDateTime = startTime 
          ? `${startDate}T${startTime}:00`
          : `${startDate}T00:00:00`;
        filters.startDate = startDateTime;
      }
      
      if (endDate) {
        const endDateTime = endTime 
          ? `${endDate}T${endTime}:00`
          : `${endDate}T23:59:59`;
        filters.endDate = endDateTime;
      }
    }

    if (selectedAction) {
      filters.action = selectedAction;
    }
    
    // Fetch logs immediately
    await fetchLogs(filters);
  };

  const handlePageSizeChange = async (e) => {
    const newPageSize = parseInt(e.target.value);
    
    // Update state
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
    
    // Fetch logs with current filters and new page size
    const filters = {
      page: 1,
      limit: newPageSize
    };
    
    if (selectedUser) {
      filters.userId = selectedUser;
    }
    
    if (timeOnlyMode) {
      filters.timeOnly = true;
      if (startTime) {
        filters.startTimeOnly = startTime;
      }
      if (endTime) {
        filters.endTimeOnly = endTime;
      }
    } else {
      if (startDate) {
        const startDateTime = startTime 
          ? `${startDate}T${startTime}:00`          : `${startDate}T00:00:00`;
        filters.startDate = startDateTime;
      }
      
      if (endDate) {
        const endDateTime = endTime 
          ? `${endDate}T${endTime}:00`
          : `${endDate}T23:59:59`;
        filters.endDate = endDateTime;
      }
    }

    if (selectedAction) {
      filters.action = selectedAction;
    }
    
    // Fetch logs immediately
    await fetchLogs(filters);
  };

  const getActionIcon = (action) => {
    switch(action) {
      case 'Download Document':
            return <Icon as={FaDownload} color="blue.500" />;
      case 'Upload Document':
            return <Icon as={FaUpload} color="green.500" />;
      case 'Login':
            return <Icon as={FaUserCheck} color="teal.500" />;
      case 'Logout':
            return <Icon as={FaUserTimes} color="red.500" />;
      default:
            return <Icon as={FaInfoCircle} color="gray.500" />;
    }
  };

  const getActionBadgeColor = (action) => {
    switch(action) {
      case 'Download Document':
            return "blue";
      case 'Upload Document':
            return "green";
      case 'Login':
            return "teal";
      case 'Logout':
            return "red";
      default:
            return "gray";
    }
  };

  // Calculate pagination values
  const totalPages = Math.ceil(totalLogs / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(startIndex + pageSize - 1, totalLogs);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Spinner size="xl" color="blue.500" thickness="4px" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Card variant="outline" borderColor="red.200">
          <CardHeader bg="red.50">
            <Heading size="md" color="red.600">Error</Heading>
          </CardHeader>
          <CardBody>
            <Text color="red.500">{error}</Text>
          </CardBody>
        </Card>
      </Box>
    );
  }

  return (
    <Box p={4} maxWidth="1400px" mx="auto">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Administrare utilizatori</Heading>
        <Flex align="center" gap={4}>
          <Button
            leftIcon={<FaUserPlus />}
            colorScheme="blue"
            variant="solid"
            onClick={handleCreateUser}
            size="md"
            borderRadius="lg"
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: 'lg'
            }}
            transition="all 0.2s"
          >
            Create User
          </Button>
          <Badge colorScheme="blue" fontSize="md" p={2} borderRadius="md">
            {users.length} Utilizatori
          </Badge>
        </Flex>
      </Flex>
      
      <Tabs variant="enclosed" colorScheme="blue" isFitted index={activeTab} onChange={setActiveTab}>
        <TabList mb="1em">
          <Tab>
            <Flex align="center">
              <Icon as={FaUsers} mr={2} />
              Utilizatori
            </Flex>
          </Tab>
          <Tab>
            <Flex align="center">
              <Icon as={FaHistory} mr={2} />
              Istoric activități
            </Flex>
          </Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel>
            <Card variant="outline" boxShadow="sm">
              <CardHeader bg="gray.50">
                <Heading size="md">Lista utilizatorilor</Heading>
              </CardHeader>
              <CardBody>
                <Box overflowX="auto">
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Nume</Th>
                        <Th>Email</Th>
                        <Th>Rol</Th>
                        <Th>Status</Th>
                        <Th>Acțiuni</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {users.map((user) => (
                        <Tr key={user.id}>
                          <Td fontWeight="medium">{user.prenom} {user.nom}</Td>
                          <Td>{user.email}</Td>
                          <Td>
                            <Badge colorScheme={user.roles === 'admin' ? 'purple' : 'blue'}>
                              {user.roles}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge colorScheme={user.verified ? 'green' : 'red'}>
                              {user.verified ? 'Verified' : 'Unverified'}
                            </Badge>
                          </Td>
                          <Td>
                            <Flex>
                              <Tooltip label="View user details">
                                <Button size="sm" colorScheme="blue" variant="ghost" mr={2}>
                                  <Icon as={FaInfoCircle} />
                                </Button>
                              </Tooltip>
                              <Tooltip label="Edit user">
                                <Button size="sm" colorScheme="teal" variant="ghost" mr={2}>
                                  <Icon as={FaUserCheck} />
                                </Button>
                              </Tooltip>
                            </Flex>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </CardBody>
            </Card>
          </TabPanel>
          
          <TabPanel>
            <Card variant="outline" boxShadow="sm" mb={4}>
              <CardHeader bg="gray.50">
                <Flex justify="space-between" align="center">
                  <Heading size="md">Activity Logs</Heading>
                  <Button 
                    leftIcon={<Icon as={isFilterExpanded ? FaFilter : FaSearch} />}
                    colorScheme="blue" 
                    variant="outline" 
                    size="sm"
                    onClick={toggleFilterExpanded}
                  >
                    {isFilterExpanded ? 'Ascunde filtrele' : 'Afișează filtrele'}
                  </Button>
                </Flex>
              </CardHeader>
              
              {isFilterExpanded && (
                <CardBody borderBottom="1px" borderColor="gray.200">
                  <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={4}>
                    <Box>
                      <Text mb={2} fontWeight="medium">Utilizator</Text>
                      <Select
                        placeholder="Selectează utilizator"
                        value={selectedUser}
                        onChange={handleUserChange}
                        size="md"
                      >
                        <option value="">Toți utilizatorii</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.prenom} {user.nom}
                          </option>
                        ))}
                      </Select>
                    </Box>
                    
                    <Box>
                      <Text mb={2} fontWeight="medium">Tip acțiune</Text>
                      <Select
                        placeholder="Selectează tipul acțiunii"
                        value={selectedAction}
                        onChange={handleActionChange}
                        className="w-64"
                      >
                        <option value="">Toate acțiunile</option>
                        {(allActionTypes.length > 0 ? allActionTypes : actionTypes).map((action, index) => (
                          <option key={index} value={action}>
                            {action}
                          </option>
                        ))}
                      </Select>
                    </Box>
                    
                    <Box>
                      <Text mb={2} fontWeight="medium">Mod filtrare timp</Text>
                      <Checkbox 
                        isChecked={timeOnlyMode} 
                        onChange={toggleTimeOnlyMode}
                        colorScheme="blue"
                      >
                        Filtrează după timp (ignoră data)
                      </Checkbox>
                    </Box>
                    
                    {!timeOnlyMode ? (
                      <>
                        <Box>
                          <Text mb={2} fontWeight="medium">Data și ora început</Text>
                          <Flex>
                            <Input
                              type="date"
                              value={startDate}
                              onChange={handleStartDateChange}
                              mr={2}
                              size="md"
                            />
                            <Input
                              type="time"
                              value={startTime}
                              onChange={handleStartTimeChange}
                              size="md"
                            />
                          </Flex>
                        </Box>
                        
                        <Box>
                          <Text mb={2} fontWeight="medium">Data și ora sfârșit</Text>
                          <Flex>
                            <Input
                              type="date"
                              value={endDate}
                              onChange={handleEndDateChange}
                              mr={2}
                              size="md"
                            />
                            <Input
                              type="time"
                              value={endTime}
                              onChange={handleEndTimeChange}
                              size="md"
                            />
                          </Flex>
                        </Box>
                      </>
                    ) : (
                      <>
                        <Box>
                          <Text mb={2} fontWeight="medium">Ora început</Text>
                          <Input
                            type="time"
                            value={startTime}
                            onChange={handleStartTimeChange}
                            size="md"
                          />
                        </Box>
                        
                        <Box>
                          <Text mb={2} fontWeight="medium">Ora sfârșit</Text>
                          <Input
                            type="time"
                            value={endTime}
                            onChange={handleEndTimeChange}
                            size="md"
                          />
                        </Box>
                      </>
                    )}
                  </Grid>
                  
                  <Flex justify="flex-end" mt={4}>
                    <Button
                      leftIcon={<Icon as={FaTrash} />}
                      colorScheme="gray"
                      variant="outline"
                      mr={2}
                      onClick={handleClear}
                    >
                      Șterge
                    </Button>
                    <Button
                      leftIcon={<Icon as={FaSearch} />}
                      colorScheme="blue"
                      onClick={handleSearch}
                    >
                      Caută
                    </Button>
                  </Flex>
                </CardBody>
              )}
              
              <CardBody>
                <Box 
                  overflowX="auto" 
                  maxHeight="400px" 
                  overflowY="auto" 
                  borderWidth="1px" 
                  borderColor="gray.200" 
                  borderRadius="md"
                >
                  <Table variant="simple">
                    <Thead position="sticky" top={0} bg="white" zIndex={1}>
                      <Tr>
                        <Th>Utilizator</Th>
                        <Th>Acțiune</Th>
                        <Th>Detalii</Th>
                        <Th>Data și ora</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {logs.length > 0 ? (
                        logs.map((log, index) => (
                          <Tr key={index}>
                            <Td fontWeight="medium">{log.prenom} {log.nom}</Td>
                            <Td>
                              <Flex align="center">
                                {getActionIcon(log.action)}
                                <Badge ml={2} colorScheme={getActionBadgeColor(log.action)}>
                                  {log.action}
                                </Badge>
                              </Flex>
                            </Td>
                            <Td maxW="300px" isTruncated>
                              <Tooltip label={log.details}>
                                <Text isTruncated>{log.details}</Text>
                              </Tooltip>
                            </Td>
                            <Td>
                              <Flex direction="column">
                                <Text fontSize="sm">
                                  {new Date(log.created_at).toLocaleDateString()}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  {new Date(log.created_at).toLocaleTimeString()}
                                </Text>
                              </Flex>
                            </Td>
                          </Tr>
                        ))
                      ) : (
                        <Tr>
                          <Td colSpan={4} textAlign="center" py={4}>
                            <Text color="gray.500">No logs found matching your criteria</Text>
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </Box>
                
                {/* Pagination Controls */}
                <Flex justify="space-between" align="center" mt={4}>
                  <HStack spacing={2}>
                    <Text fontSize="sm">Afișează:</Text>
                    <ChakraSelect 
                      size="sm" 
                      width="70px" 
                      value={pageSize} 
                      onChange={handlePageSizeChange}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </ChakraSelect>
                    <Text fontSize="sm">entries</Text>
                  </HStack>
                  
                  <Text fontSize="sm">
                    Afișează {startIndex} la {endIndex} din {totalLogs} înregistrări
                  </Text>
                  
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      leftIcon={<Icon as={FaChevronLeft} />}
                      onClick={() => handlePageChange(currentPage - 1)}
                      isDisabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Text fontSize="sm">
                      Pagina {currentPage} din {totalPages}
                    </Text>
                    <Button
                      size="sm"
                      rightIcon={<Icon as={FaChevronRight} />}
                      onClick={() => handlePageChange(currentPage + 1)}
                      isDisabled={currentPage === totalPages}
                    >
                      Următor
                    </Button>
                  </HStack>
                </Flex>
              </CardBody>
              
              <CardFooter bg="gray.50" justify="space-between">
                <Text fontSize="sm" color="gray.500">
                  Afișează {logs.length} înregistrări
                </Text>
                <Badge colorScheme="blue">
                  <Flex align="center">
                    <Icon as={FaHistory} mr={1} />
                    Istoric activități
                  </Flex>
                </Badge>
              </CardFooter>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default ManageUsers; 
