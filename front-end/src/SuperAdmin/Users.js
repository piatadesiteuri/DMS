import React, { useState, useEffect } from 'react';
import { backend } from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  List,
  ListItem,
  ListIcon,
  Stack,
  Text,
  useColorModeValue,
  VStack,
  HStack,
  Badge,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  ScaleFade,
  Fade,
  useBreakpointValue,
  Input,
  Select,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Icon,
  Tooltip,
  Avatar,
  AvatarBadge,
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatGroup,
  Tag,
  TagLabel,
  TagLeftIcon,
} from '@chakra-ui/react';
import { 
  FaUser, 
  FaUserShield, 
  FaUserCheck, 
  FaSearch,
  FaEdit,
  FaTrash,
  FaHistory,
  FaChevronLeft,
  FaChevronRight,
  FaUserPlus,
  FaBuilding,
  FaDownload,
  FaUpload,
  FaSignInAlt,
  FaSignOutAlt,
  FaCalendarAlt,
  FaFileAlt,
  FaTimes,
  FaFilter,
  FaEye,
  FaUserSecret,
} from 'react-icons/fa';

const MotionBox = motion(Box);

const SuperAdminUsers = () => {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentUsersPage, setCurrentUsersPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(6);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [institutionInfo, setInstitutionInfo] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isFilterOpen, 
    onOpen: onFilterOpen, 
    onClose: onFilterClose 
  } = useDisclosure();
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    status: '',
  });

  // Filter states for activity logs
  const [filters, setFilters] = useState({
    userName: '',
    userId: '',
    startDate: '',
    endDate: '',
    actionType: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchActivityLogs();
    fetchInstitutionInfo();
  }, []);

  useEffect(() => {
    if (activityLogs.length > 0) {
      filterLogs();
    }
  }, [searchTerm, activityLogs]);

  const filterLogs = () => {
    const filtered = activityLogs.filter(log => {
      const searchLower = searchTerm.toLowerCase();
      return (
        log.user_name?.toLowerCase().includes(searchLower) ||
        log.prenom?.toLowerCase().includes(searchLower) ||
        log.nom_document?.toLowerCase().includes(searchLower) ||
        log.action_type?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  const getFilteredAndSortedUsers = () => {
    let filteredUsers = users.filter(user => 
      user.roles !== 'superadmin'
    );

    if (roleFilter !== 'all') {
      filteredUsers = filteredUsers.filter(user => 
        user.roles?.toLowerCase() === roleFilter.toLowerCase()
      );
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.prenom?.toLowerCase().includes(searchLower) ||
        user.nom?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    }

    return filteredUsers;
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${backend}/post_docs/superadmin/users`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch users');
      setLoading(false);
    }
  };

  const fetchInstitutionInfo = async () => {
    try {
      const response = await fetch(`${backend}/post_docs/superadmin/institution-info`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setInstitutionInfo(data.institution);
      }
    } catch (err) {
      console.log('Institution info not available');
    }
  };

  const fetchActivityLogs = async (appliedFilters = {}) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`${backend}/post_docs/superadmin/user-activity?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setActivityLogs(data.logs);
        setFilteredLogs(data.logs);
      } else {
        setActivityLogs([]);
        setFilteredLogs([]);
      }
    } catch (err) {
      setError('Failed to fetch activity logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      name: `${user.prenom} ${user.nom}`,
      email: user.email,
      role: user.roles,
      status: user.verified ? 'verified' : 'unverified',
    });
    onOpen();
  };

  const handleUpdate = async () => {
    try {
      const response = await fetch(`${backend}/admin/update-user`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          userId: selectedUser.id_user,
          ...formData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      fetchUsers();
      onClose();
        toast({
        title: "Utilizator actualizat",
        description: "Utilizatorul a fost actualizat cu succes",
        status: "success",
          duration: 3000,
          isClosable: true,
        });
    } catch (err) {
        toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza utilizatorul",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Ești sigur că vrei să ștergi acest utilizator?')) {
      try {
        const response = await fetch(`${backend}/admin/del`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
          body: JSON.stringify({ userId })
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      fetchUsers();
      toast({
          title: "Utilizator șters",
          description: "Utilizatorul a fost șters cu succes",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
          title: "Eroare",
          description: "Nu s-a putut șterge utilizatorul",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
    }
  };

  const handleImpersonate = async (user) => {
    // Show modern confirmation modal instead of window.confirm
    const isConfirmed = await new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.innerHTML = `
        <div id="impersonate-modal" style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          backdrop-filter: blur(5px);
        ">
          <div style="
            background: white;
            border-radius: 16px;
            padding: 24px;
            max-width: 400px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          ">
            <h3 style="margin: 0 0 16px 0; color: #2D3748; font-size: 18px; font-weight: 600;">
              🔄 Confirmare Impersonare
            </h3>
            <p style="margin: 0 0 20px 0; color: #4A5568; line-height: 1.5;">
              Vrei să te conectezi ca <strong>${user.prenom} ${user.nom}</strong>?<br>
              <small style="color: #718096;">Vei vedea sistemul exact cum îl vede acest utilizator.</small>
            </p>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
              <button id="cancel-btn" style="
                padding: 8px 16px;
                border: 1px solid #E2E8F0;
                background: white;
                border-radius: 8px;
                cursor: pointer;
                color: #4A5568;
              ">Anulează</button>
              <button id="confirm-btn" style="
                padding: 8px 16px;
                border: none;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
              ">Conectează-te</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      document.getElementById('confirm-btn').onclick = () => {
        document.body.removeChild(modal);
        resolve(true);
      };
      
      document.getElementById('cancel-btn').onclick = () => {
        document.body.removeChild(modal);
        resolve(false);
  };

      // Close on backdrop click
      modal.onclick = (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          resolve(false);
        }
      };
    });

    if (!isConfirmed) return;

    try {
      // Show loading toast
      const loadingToastId = toast({
        title: "Se conectează...",
        description: `Pregătire impersonare pentru ${user.prenom} ${user.nom}`,
        status: "loading",
        duration: null,
        isClosable: false,
      });

        const response = await fetch(`${backend}/impersonate`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Origin': window.location.origin
            },
            body: JSON.stringify({ userId: user.id_user })
        });

      // Close loading toast
      toast.close(loadingToastId);

        if (!response.ok) {
        throw new Error('Impersonation request failed');
        }

        const data = await response.json();

      if (data.success) {
        // Show success message
        toast({
          title: "Impersonare activă! 🎭",
          description: `Conectat ca ${user.prenom} ${user.nom}. Vei vedea un banner sus pentru a reveni.`,
          status: "success",
          duration: 5000,
          isClosable: true,
          position: "top"
        });

        // Redirect based on user role
        setTimeout(() => {
          // Don't clear localStorage - let App.js handle authentication via session-check
          // localStorage.removeItem('isAuthenticated');
          // localStorage.removeItem('userRole');
          
          // Force page refresh to ensure clean state
          if (user.roles === 'admin') {
            window.location.href = '/admin';
          } else if (user.roles === 'director') {
            window.location.href = '/director';
          } else {
        window.location.href = '/';
          }
        }, 1500);

      } else {
        throw new Error(data.message || 'Impersonation failed');
      }
    } catch (err) {
      console.error('Impersonation error:', err);
        toast({
        title: "Eroare la impersonare",
        description: err.message || "Nu s-a putut face impersonarea. Încearcă din nou.",
            status: "error",
        duration: 5000,
            isClosable: true,
        });
    }
  };

  const getRoleBadge = (user) => {
    const colors = {
      admin: {
        bg: 'purple.500',
        color: 'white',
        icon: FaUserShield,
        label: 'Administrator'
      },
      utilisateur: {
        bg: 'blue.500',
        color: 'white',
        icon: FaUser,
        label: 'Utilizator'
      },
      responsable: {
        bg: 'green.500',
        color: 'white',
        icon: FaUserCheck,
        label: 'Responsabil'
      }
    };

    const userRole = user?.roles?.toLowerCase() || 'utilisateur';
    const roleStyle = colors[userRole] || colors.utilisateur;

    return (
      <Badge
        colorScheme={userRole === 'admin' ? 'purple' : userRole === 'responsable' ? 'green' : 'blue'}
        variant="solid"
        px={3}
        py={1}
        borderRadius="full"
        fontSize="xs"
        fontWeight="600"
        textTransform="uppercase"
        letterSpacing="0.5px"
      >
        <HStack spacing={1}>
          <Icon as={roleStyle.icon} boxSize={3} />
          <Text>{roleStyle.label}</Text>
        </HStack>
      </Badge>
    );
  };

  const formatDate = (timestamp) => {
    try {
      if (!timestamp) return 'N/A';
      return new Date(timestamp).toLocaleString('ro-RO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
      }
  };

  const getActionIcon = (actionType) => {
    switch(actionType?.toLowerCase()) {
      case 'login': return FaSignInAlt;
      case 'logout': return FaSignOutAlt;
      case 'upload': return FaUpload;
      case 'download': return FaDownload;
      case 'delete': return FaTimes;
      default: return FaFileAlt;
    }
  };

  const getActionColor = (actionType) => {
    switch(actionType?.toLowerCase()) {
      case 'login': return 'green';
      case 'logout': return 'orange';
      case 'upload': return 'blue';
      case 'download': return 'purple';
      case 'delete': return 'red';
      default: return 'gray';
    }
  };

  const handleFilterSubmit = () => {
    fetchActivityLogs(filters);
    onFilterClose();
      toast({
      title: 'Filters Applied',
      description: 'Activity logs have been filtered',
      status: 'success',
      duration: 2000,
        isClosable: true,
      });
  };

  const clearFilters = () => {
    setFilters({
      userName: '',
      userId: '',
      startDate: '',
      endDate: '',
      actionType: '',
    });
    fetchActivityLogs();
  };

  if (loading) {
    return (
      <Box position="relative" minH="100vh">
        <Container maxW="container.xl" py={12}>
          <Center minH="400px">
            <VStack spacing={4}>
              <Spinner size="xl" color="purple.500" thickness="4px" />
              <Text fontSize="lg" color="gray.600">Se încarcă utilizatorii...</Text>
            </VStack>
          </Center>
      </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box position="relative" minH="100vh">
        <Container maxW="container.xl" py={12}>
          <Alert status="error" borderRadius="lg">
            <AlertIcon />
            {error}
          </Alert>
      </Container>
      </Box>
    );
  }

  const filteredUsers = getFilteredAndSortedUsers();
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentUsersPage - 1) * usersPerPage,
    currentUsersPage * usersPerPage
  );

  const totalLogsPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Box position="relative" minH="100vh">
      <Container maxW="container.xl" py={12}>
        <VStack spacing={8} align="stretch">
          {/* Header Section with Institution Info */}
          <MotionBox
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <VStack spacing={6} align="center" textAlign="center">
              <VStack spacing={2}>
            <Heading 
              as="h1" 
              size="2xl" 
                  bgGradient="linear(to-r, purple.600, blue.600)"
              bgClip="text"
                  fontWeight="800"
                  letterSpacing="-0.02em"
            >
                  Gestionare Utilizatori
            </Heading>
                {institutionInfo && (
                  <HStack spacing={2} color="gray.600">
                    <Icon as={FaBuilding} />
                    <Text fontSize="lg" fontWeight="500">
                      {institutionInfo.institution_name}
            </Text>
                  </HStack>
                )}
              </VStack>
              <Text fontSize="lg" color="gray.600" maxW="600px">
                Administrează și monitorizează conturile utilizatorilor din instituția ta
              </Text>
            </VStack>
          </MotionBox>

          {/* Statistics Cards */}
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6}>
              <Card bg="white" borderRadius="xl" boxShadow="lg" overflow="hidden">
                <CardBody>
                  <Stat>
                    <StatLabel color="gray.600" fontSize="sm">Total Utilizatori</StatLabel>
                    <StatNumber color="purple.600" fontSize="2xl">{filteredUsers.length}</StatNumber>
                    <StatHelpText color="gray.500">
                      <Icon as={FaUser} mr={1} />
                      Activi în sistem
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card bg="white" borderRadius="xl" boxShadow="lg" overflow="hidden">
                <CardBody>
                  <Stat>
                    <StatLabel color="gray.600" fontSize="sm">Administratori</StatLabel>
                    <StatNumber color="purple.600" fontSize="2xl">
                      {filteredUsers.filter(u => u.roles === 'admin').length}
                    </StatNumber>
                    <StatHelpText color="gray.500">
                      <Icon as={FaUserShield} mr={1} />
                      Cu privilegii extinse
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card bg="white" borderRadius="xl" boxShadow="lg" overflow="hidden">
                <CardBody>
                  <Stat>
                    <StatLabel color="gray.600" fontSize="sm">Utilizatori Standard</StatLabel>
                    <StatNumber color="blue.600" fontSize="2xl">
                      {filteredUsers.filter(u => u.roles === 'utilisateur').length}
                    </StatNumber>
                    <StatHelpText color="gray.500">
                      <Icon as={FaUser} mr={1} />
                      Acces de bază
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card bg="white" borderRadius="xl" boxShadow="lg" overflow="hidden">
                <CardBody>
                  <Stat>
                    <StatLabel color="gray.600" fontSize="sm">Activități Recente</StatLabel>
                    <StatNumber color="green.600" fontSize="2xl">{filteredLogs.length}</StatNumber>
                    <StatHelpText color="gray.500">
                      <Icon as={FaHistory} mr={1} />
                      În ultimele 30 zile
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
            </SimpleGrid>
          </MotionBox>

          {/* Main Content */}
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card bg="white" borderRadius="2xl" boxShadow="xl" overflow="hidden">
              <CardHeader bg="gray.50" borderBottom="1px" borderColor="gray.200">
                <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
          <HStack spacing={4}>
            <Select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentUsersPage(1);
              }}
              w="200px"
                      size="md"
                      borderRadius="lg"
            >
              <option value="all">Toate rolurile</option>
              <option value="admin">Administratori</option>
                      <option value="utilisateur">Utilizatori</option>
                      <option value="responsable">Responsabili</option>
            </Select>
            <InputGroup maxW="300px">
                      <InputLeftElement>
                        <Icon as={FaSearch} color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Caută utilizatori..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                        borderRadius="lg"
              />
            </InputGroup>
          </HStack>
          <Button
                    colorScheme="purple"
            leftIcon={<Icon as={FaUserPlus} />}
            size="md"
                    borderRadius="lg"
                    fontWeight="600"
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: 'lg'
            }}
          >
                    Adaugă Utilizator
          </Button>
        </Flex>
              </CardHeader>

              <CardBody p={0}>
                <Tabs variant="line" colorScheme="purple">
                  <TabList px={6} pt={4}>
                    <Tab fontWeight="600" _selected={{ color: 'purple.600', borderColor: 'purple.600' }}>
              <HStack>
                <Icon as={FaUser} />
                        <Text>Utilizatori ({filteredUsers.length})</Text>
              </HStack>
            </Tab>
                    <Tab fontWeight="600" _selected={{ color: 'purple.600', borderColor: 'purple.600' }}>
              <HStack>
                <Icon as={FaHistory} />
                        <Text>Jurnal Activități ({filteredLogs.length})</Text>
              </HStack>
            </Tab>
          </TabList>

          <TabPanels>
                    {/* Users Tab */}
                    <TabPanel p={6}>
                      <VStack spacing={6} align="stretch">
                        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                          <AnimatePresence>
                            {paginatedUsers.map((user, index) => (
                    <MotionBox
                      key={user.id_user}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2, delay: index * 0.02 }}
                                whileHover={{ y: -4 }}
                    >
                      <Card
                        borderRadius="xl"
                        overflow="hidden"
                                  borderWidth="1px"
                                  borderColor="gray.200"
                        _hover={{
                                    borderColor: 'purple.300',
                                    boxShadow: 'lg'
                        }}
                                  transition="all 0.2s"
                                  h="full"
                      >
                                  <CardHeader pb={3}>
                                    <VStack spacing={3}>
                              <Avatar
                                name={`${user.prenom} ${user.nom}`}
                                size="lg"
                                        bg="purple.500"
                                        color="white"
                                        fontWeight="600"
                                      />
                                      <VStack spacing={1} textAlign="center">
                                        <Heading size="md" color="gray.800">
                                          {user.prenom} {user.nom}
                                        </Heading>
                                        <Text color="gray.600" fontSize="sm">
                                          {user.email}
                                        </Text>
                                        {user.institution_name && (
                                          <Text color="gray.500" fontSize="xs">
                                            {user.institution_name}
                                          </Text>
                                        )}
                              </VStack>
                            {getRoleBadge(user)}
                                    </VStack>
                        </CardHeader>
                                  
                        <Divider />
                                  
                                  <CardBody pt={4}>
                                    <HStack spacing={2} justify="center">
                                      <Tooltip label="Editează utilizator">
                              <IconButton
                                icon={<Icon as={FaEdit} />}
                                colorScheme="blue"
                                variant="ghost"
                                          size="sm"
                                onClick={() => handleEdit(user)}
                                          borderRadius="lg"
                              />
                            </Tooltip>
                                      <Tooltip label="Șterge utilizator">
                              <IconButton
                                icon={<Icon as={FaTrash} />}
                                colorScheme="red"
                                variant="ghost"
                                          size="sm"
                                onClick={() => handleDelete(user.id_user)}
                                          borderRadius="lg"
                              />
                            </Tooltip>
                                      <Tooltip label="Impersonează utilizator">
                              <IconButton
                                icon={<Icon as={FaUserSecret} />}
                                          colorScheme="orange"
                                variant="ghost"
                                          size="sm"
                                onClick={() => handleImpersonate(user)}
                                          borderRadius="lg"
                                        />
                                      </Tooltip>
                                      <Tooltip label="Vezi activitatea">
                                        <IconButton
                                          icon={<Icon as={FaHistory} />}
                                          colorScheme="green"
                                          variant="ghost"
                                          size="sm"
                                          borderRadius="lg"
                              />
                            </Tooltip>
                          </HStack>
                                  </CardBody>
                      </Card>
                    </MotionBox>
                  ))}
                          </AnimatePresence>
                        </SimpleGrid>

                        {/* Users Pagination */}
                        {totalPages > 1 && (
                          <Flex justify="space-between" align="center" pt={4}>
                            <Text fontSize="sm" color="gray.600">
                              Afișând {((currentUsersPage - 1) * usersPerPage) + 1} - {Math.min(currentUsersPage * usersPerPage, filteredUsers.length)} din {filteredUsers.length} utilizatori
                    </Text>
                  <HStack spacing={2}>
                    <IconButton
                      icon={<FaChevronLeft />}
                      size="sm"
                                variant="outline"
                      isDisabled={currentUsersPage === 1}
                                onClick={() => setCurrentUsersPage(prev => Math.max(prev - 1, 1))}
                                borderRadius="lg"
                    />
                              <Text fontSize="sm" minW="60px" textAlign="center">
                                {currentUsersPage} / {totalPages}
                              </Text>
                    <IconButton
                      icon={<FaChevronRight />}
                      size="sm"
                                variant="outline"
                                isDisabled={currentUsersPage === totalPages}
                                onClick={() => setCurrentUsersPage(prev => Math.min(prev + 1, totalPages))}
                                borderRadius="lg"
                    />
                  </HStack>
                </Flex>
                        )}
                      </VStack>
            </TabPanel>

                    {/* Activity Logs Tab */}
                    <TabPanel p={6}>
                      <VStack spacing={6} align="stretch">
                        <Flex justify="space-between" align="center">
                          <Heading size="md" color="gray.800">
                            Jurnal Activități Utilizatori
                          </Heading>
                          <HStack spacing={2}>
                            <InputGroup maxW="300px">
                              <InputLeftElement>
                                <Icon as={FaSearch} color="gray.400" />
                  </InputLeftElement>
                  <Input
                                placeholder="Caută în activități..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                                borderRadius="lg"
                                size="sm"
                  />
                </InputGroup>
                            <Button
                              leftIcon={<FaFilter />}
                              colorScheme="purple"
                              variant="outline"
                              onClick={onFilterOpen}
                              size="sm"
                              borderRadius="lg"
                            >
                              Filtrează
                            </Button>
                            <Button
                              leftIcon={<FaTimes />}
                              variant="ghost"
                              onClick={clearFilters}
                              size="sm"
                              borderRadius="lg"
                            >
                              Șterge filtre
                            </Button>
                          </HStack>
                        </Flex>

                        {logsLoading ? (
                          <Center py={10}>
                            <VStack spacing={4}>
                              <Spinner size="lg" color="purple.500" />
                              <Text color="gray.600">Se încarcă activitățile...</Text>
                            </VStack>
                          </Center>
                        ) : filteredLogs.length === 0 ? (
                          <Center py={10}>
                            <VStack spacing={4}>
                              <Icon as={FaHistory} boxSize={12} color="gray.300" />
                              <Text color="gray.500" fontSize="lg">Nu există activități de afișat</Text>
                            </VStack>
                          </Center>
                        ) : (
                          <>
                            <TableContainer borderRadius="xl" border="1px" borderColor="gray.200">
                              <Table variant="simple" size="md">
                                <Thead bg="gray.50">
                                  <Tr>
                                    <Th color="gray.600" fontWeight="600">Utilizator</Th>
                                    <Th color="gray.600" fontWeight="600">Acțiune</Th>
                                    <Th color="gray.600" fontWeight="600">Document</Th>
                                    <Th color="gray.600" fontWeight="600">Data & Ora</Th>
                                    <Th color="gray.600" fontWeight="600">Tip</Th>
                                  </Tr>
                                </Thead>
                                <Tbody>
                                  {paginatedLogs.map((log, index) => (
                                    <Tr key={index} _hover={{ bg: 'gray.50' }}>
                                      <Td>
                                        <HStack spacing={3}>
                                          <Avatar
                                            name={log.user_name || 'N/A'}
                                            size="sm"
                                            bg="purple.500"
                                          />
                                          <VStack align="start" spacing={0}>
                                            <Text fontWeight="500" fontSize="sm">
                                              {log.user_name || 'N/A'}
                            </Text>
                                            <Text color="gray.500" fontSize="xs">
                                              ID: {log.id_user}
                        </Text>
                                          </VStack>
                                        </HStack>
                                      </Td>
                                      <Td>
                                        <Tag
                                          colorScheme={getActionColor(log.action_type)}
                                          variant="subtle"
                                          borderRadius="full"
                          size="sm"
                                        >
                                          <TagLeftIcon as={getActionIcon(log.action_type)} />
                                          <TagLabel fontWeight="500">
                                            {log.action_type || 'N/A'}
                                          </TagLabel>
                                        </Tag>
                                      </Td>
                                      <Td>
                                        <Text fontSize="sm" color="gray.700" maxW="200px" isTruncated>
                                          {log.details || log.nom_document || '-'}
                                        </Text>
                                      </Td>
                                      <Td>
                                        <HStack spacing={2}>
                                          <Icon as={FaCalendarAlt} color="gray.400" boxSize={3} />
                                          <Text fontSize="sm" color="gray.600">
                                            {formatDate(log.action_timestamp)}
                                          </Text>
                      </HStack>
                                      </Td>
                                      <Td>
                                        <Badge
                                          colorScheme={log.log_type === 'security_log' ? 'red' : 'blue'}
                                          fontSize="xs"
                                        >
                                          {log.log_type === 'security_log' ? 'Securitate' : 'Document'}
                                        </Badge>
                                      </Td>
                                    </Tr>
                                  ))}
                                </Tbody>
                              </Table>
                            </TableContainer>

                            {/* Logs Pagination */}
                            {totalLogsPages > 1 && (
                              <Flex justify="space-between" align="center" pt={4}>
                                <Text fontSize="sm" color="gray.600">
                                  Afișând {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredLogs.length)} din {filteredLogs.length} activități
                                </Text>
                      <HStack spacing={2}>
                        <IconButton
                          icon={<FaChevronLeft />}
                          size="sm"
                                    variant="outline"
                          isDisabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    borderRadius="lg"
                        />
                                  <Text fontSize="sm" minW="60px" textAlign="center">
                                    {currentPage} / {totalLogsPages}
                                  </Text>
                        <IconButton
                          icon={<FaChevronRight />}
                          size="sm"
                                    variant="outline"
                                    isDisabled={currentPage === totalLogsPages}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalLogsPages))}
                                    borderRadius="lg"
                        />
                      </HStack>
                    </Flex>
                            )}
                          </>
                        )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
              </CardBody>
            </Card>
          </MotionBox>
        </VStack>
      </Container>

      {/* Edit User Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
          <ModalOverlay />
          <ModalContent>
          <ModalHeader>Editează Utilizator</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Nume</FormLabel>
                  <Input
                    value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </FormControl>
                <FormControl>
                <FormLabel>Email</FormLabel>
                  <Input
                  type="email"
                    value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </FormControl>
                <FormControl>
                    <FormLabel>Rol</FormLabel>
                  <Select
                    value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                  <option value="utilisateur">Utilizator</option>
                    <option value="admin">Administrator</option>
                  <option value="responsable">Responsabil</option>
                  </Select>
                </FormControl>
                <FormControl>
                <FormLabel>Status</FormLabel>
                  <Select
                    value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                  <option value="verified">Verificat</option>
                  <option value="unverified">Neverificat</option>
                  </Select>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>
                Anulează
              </Button>
            <Button colorScheme="purple" onClick={handleUpdate}>
              Actualizează
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

      {/* Filter Modal */}
      <Modal isOpen={isFilterOpen} onClose={onFilterClose} size="lg">
        <ModalOverlay backdropFilter="blur(10px)" />
        <ModalContent borderRadius="xl" mx={4}>
          <ModalHeader>
            <HStack spacing={3}>
              <Icon as={FaFilter} color="purple.500" />
              <Text>Filtrează Jurnalul de Activități</Text>
            </HStack>
          </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
              <FormControl>
                <FormLabel>Nume Utilizator</FormLabel>
                  <Input
                  placeholder="Caută după nume..."
                  value={filters.userName}
                  onChange={(e) => setFilters({...filters, userName: e.target.value})}
                  borderRadius="lg"
                />
                </FormControl>
                
              <FormControl>
                <FormLabel>ID Utilizator</FormLabel>
                  <Input
                  placeholder="Introdu ID utilizator..."
                  value={filters.userId}
                  onChange={(e) => setFilters({...filters, userId: e.target.value})}
                  borderRadius="lg"
                />
                </FormControl>
                
              <FormControl>
                <FormLabel>Tip Acțiune</FormLabel>
                <Select
                  placeholder="Selectează tipul acțiunii..."
                  value={filters.actionType}
                  onChange={(e) => setFilters({...filters, actionType: e.target.value})}
                  borderRadius="lg"
                >
                  <option value="login">Login</option>
                  <option value="logout">Logout</option>
                  <option value="upload">Upload</option>
                  <option value="download">Download</option>
                  <option value="view">Vizualizare</option>
                  <option value="edit">Editare</option>
                  <option value="delete">Ștergere</option>
                </Select>
                </FormControl>
                
              <HStack spacing={4} w="full">
                <FormControl>
                  <FormLabel>Data de început</FormLabel>
                  <Input
                    type="datetime-local"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    borderRadius="lg"
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Data de sfârșit</FormLabel>
                  <Input
                    type="datetime-local"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    borderRadius="lg"
                  />
                </FormControl>
              </HStack>
              </VStack>
            </ModalBody>

            <ModalFooter>
            <Button variant="ghost" onClick={onFilterClose} borderRadius="lg" mr={3}>
                Anulează
              </Button>
              <Button 
              colorScheme="purple"
              onClick={handleFilterSubmit}
              borderRadius="lg"
              leftIcon={<FaFilter />}
              >
              Aplică Filtrele
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
    </Box>
  );
};

export default SuperAdminUsers; 