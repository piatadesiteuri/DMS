import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  useColorModeValue,
  VStack,
  HStack,
  Badge,
  useToast,
  Input,
  Select,
  Card,
  CardHeader,
  CardBody,
  Icon,
  Tooltip,
  Avatar,
  InputGroup,
  InputLeftElement,
  IconButton,
  ScaleFade,
  Fade,
  Stack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Divider,
  Grid,
} from '@chakra-ui/react';
import { 
  FaUser, 
  FaUserShield, 
  FaUserCheck, 
  FaCrown,
  FaSearch,
  FaEdit,
  FaTrash,
  FaChevronDown,
  FaBuilding,
  FaPlus,
  FaMapMarkerAlt,
  FaPhone,
  FaChevronUp,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { backend } from '../config';
import 'leaflet/dist/leaflet.css';
import MapWrapper from './MapWrapper';
import { useNavigate } from 'react-router-dom';
const MotionBox = motion(Box);
const MotionButton = motion(Button);
const MotionTr = motion(Tr);
const MotionTd = motion(Td);

// Create a separate component for the map
const MapComponent = lazy(() => import('./MapComponent'));

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);
  const toast = useToast();
  const [institutions, setInstitutions] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [institutionData, setInstitutionData] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
    location: { lat: 0, lng: 0 },
    superadmin: {
      username: '',
      password: '',
      confirmPassword: '',
      email: '',
      phone: '',
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const navigate = useNavigate();
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [hoveredRow, setHoveredRow] = useState(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const headingColor = useColorModeValue('gray.800', 'white');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        when: "beforeChildren"
      }
    }
  };

  const rowVariants = {
    hidden: { 
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: {
        duration: 0.2
      }
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchInstitutions();
  }, []);

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
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setLoading(false);
    }
  };

  const fetchInstitutions = async () => {
    try {
      const response = await fetch(`${backend}/post_docs/institutions`, {
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
      
      // Fetch user counts for each institution
      const institutionsWithUserCount = await Promise.all(
        data.map(async (institution) => {
          const usersResponse = await fetch(`${backend}/post_docs/institutions/${institution.id_institution}/users`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Origin': window.location.origin
            }
          });
          
          if (!usersResponse.ok) {
            throw new Error(`HTTP error! status: ${usersResponse.status}`);
          }
          
          const usersData = await usersResponse.json();
          return {
            ...institution,
            users_count: usersData.length
          };
        })
      );

      setInstitutions(institutionsWithUserCount);
    } catch (error) {
      console.error('Error fetching institutions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch institutions',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const getRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case 'superadmin':
        return <FaCrown color="gold" />;
      case 'admin':
        return <FaUserShield color="blue" />;
      case 'director':
        return <FaUser color="purple" />;
      case 'responsable':
        return <FaUserCheck color="green" />;
      default:
        return <FaUser color="gray" />;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'superadmin':
        return 'yellow';
      case 'admin':
        return 'blue';
      case 'director':
        return 'purple';
      case 'responsable':
        return 'green';
      default:
        return 'gray';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.prenom?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.nom?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.roles?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.roles?.toLowerCase() === roleFilter.toLowerCase();
    
    const matchesInstitution = institutionFilter === 'all' || user.institution_id?.toString() === institutionFilter;
    
    return matchesSearch && matchesRole && matchesInstitution;
  });

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortConfig.key === 'institution') {
      const aInstitution = institutions.find(inst => inst.id_institution === a.institution_id)?.name || '';
      const bInstitution = institutions.find(inst => inst.id_institution === b.institution_id)?.name || '';
      if (sortConfig.direction === 'ascending') {
        return aInstitution.localeCompare(bInstitution);
      }
      return bInstitution.localeCompare(aInstitution);
    }
    if (sortConfig.key) {
      if (sortConfig.direction === 'ascending') {
        return a[sortConfig.key] > b[sortConfig.key] ? 1 : -1;
      }
      return a[sortConfig.key] < b[sortConfig.key] ? 1 : -1;
    }
    return 0;
  });

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = sortedUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(sortedUsers.length / usersPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, institutionFilter]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
      confirmPassword: '',
    };

    if (!validateEmail(institutionData.superadmin.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!validatePassword(institutionData.superadmin.password)) {
      newErrors.password = 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }

    if (institutionData.superadmin.password !== institutionData.superadmin.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.values(newErrors).every(error => error === '');
  };

  const createInstitution = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please check the form for errors',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setLoading(true);
      
      // Get the current user's ID from localStorage
      const currentUserId = localStorage.getItem('userId');
      
      // Generate username from firstName and lastName
      const username = `${institutionData.superadmin.firstName.toLowerCase()}.${institutionData.superadmin.lastName.toLowerCase()}`;
      
      const institutionPayload = {
        name: institutionData.name,
        address: institutionData.address,
        email: institutionData.email,
        phone: institutionData.phone,
        location: institutionData.location,
        superadmin: {
          username: username,
          prenom: institutionData.superadmin.firstName,
          nom: institutionData.superadmin.lastName,
          email: institutionData.superadmin.email,
          password: institutionData.superadmin.password,
          phone_number: institutionData.superadmin.phone,
          roles: 'superadmin',
          accepted: 1,
          verified: 1,
          diffuse: 1,
          upload: 1,
          download: 1,
          print: 1,
          created_by: currentUserId
        }
      };

      const response = await fetch(`${backend}/post_docs/institutions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(institutionPayload),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create institution');
      }

      const data = await response.json();
      setInstitutions([...institutions, { ...institutionData, id: data.institutionId }]);
      setInstitutionData({
        name: '',
        address: '',
        email: '',
        phone: '',
        location: { lat: 0, lng: 0 },
        superadmin: {
          username: '',
          password: '',
          confirmPassword: '',
          email: '',
          phone: '',
          firstName: '',
          lastName: '',
        },
      });
      onClose();
      toast({
        title: 'Success',
        description: 'Institution created successfully',
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
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInstitution = async (id) => {
    try {
      const response = await fetch(`${backend}/post_docs/institutions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete institution');
      }

      setInstitutions(institutions.filter(inst => inst.id_institution !== id));
      
      toast({
        title: 'Success',
        description: 'Institution deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error deleting institution:', error);
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const modalVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.8,
      y: 20
    },
    visible: { 
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: 20,
      transition: {
        duration: 0.2,
        ease: "easeIn"
      }
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={10}>
        <Flex justify="center" align="center" minH="200px">
          <ScaleFade initialScale={0.9} in={true}>
            <Text>Loading users...</Text>
          </ScaleFade>
        </Flex>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8}>
        <Box textAlign="center" maxW="800px" mx="auto">
          <Fade in={true}>
            <Heading 
              as="h1" 
              size="2xl" 
              mb={4}
              bgGradient="linear(to-r, blue.500, purple.500)"
              bgClip="text"
              fontWeight="extrabold"
            >
              User Management
            </Heading>
            <Text fontSize="xl" color={textColor}>
              Manage and monitor user accounts
            </Text>
          </Fade>
        </Box>

        <Tabs variant="enclosed" w="full">
          <TabList>
            <Tab _selected={{ color: 'white', bg: 'blue.500' }}>Manage Users</Tab>
            <Tab _selected={{ color: 'white', bg: 'blue.500' }}>Manage Institution</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <VStack spacing={6} w="full">
                <Flex justify="space-between" w="full" align="center" mb={6}>
                  <HStack spacing={4}>
                    <Menu>
                      <MenuButton
                        as={Button}
                        rightIcon={<FaChevronDown />}
                        variant="outline"
                        borderColor="blue.200"
                        _hover={{ bg: 'blue.50', borderColor: 'blue.300' }}
                        _active={{ bg: 'blue.100' }}
                        minW="200px"
                        textAlign="left"
                        bg="white"
                        color="blue.700"
                        fontWeight="medium"
                      >
                        {roleFilter === 'all' ? 'All Roles' : roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}
                      </MenuButton>
                      <MenuList 
                        bg="white" 
                        borderColor="blue.200"
                        boxShadow="0 4px 12px rgba(0, 0, 0, 0.1)"
                        zIndex={2}
                      >
                        <MenuItem 
                          onClick={() => setRoleFilter('all')}
                          _hover={{ bg: 'blue.50' }}
                          _focus={{ bg: 'blue.50' }}
                        >
                          All Roles
                        </MenuItem>
                        <MenuItem 
                          onClick={() => setRoleFilter('superadmin')}
                          _hover={{ bg: 'blue.50' }}
                          _focus={{ bg: 'blue.50' }}
                        >
                          Super Admin
                        </MenuItem>
                        <MenuItem 
                          onClick={() => setRoleFilter('admin')}
                          _hover={{ bg: 'blue.50' }}
                          _focus={{ bg: 'blue.50' }}
                        >
                          Admins
                        </MenuItem>
                        <MenuItem 
                          onClick={() => setRoleFilter('user')}
                          _hover={{ bg: 'blue.50' }}
                          _focus={{ bg: 'blue.50' }}
                        >
                          Users
                        </MenuItem>
                      </MenuList>
                    </Menu>
                    <Menu>
                      <MenuButton
                        as={Button}
                        rightIcon={<FaChevronDown />}
                        variant="outline"
                        borderColor="blue.200"
                        _hover={{ bg: 'blue.50', borderColor: 'blue.300' }}
                        _active={{ bg: 'blue.100' }}
                        minW="200px"
                        textAlign="left"
                        bg="white"
                        color="blue.700"
                        fontWeight="medium"
                        ml={4}
                      >
                        {institutionFilter === 'all' ? 'All Institutions' : institutions.find(inst => inst.id_institution.toString() === institutionFilter)?.name || 'All Institutions'}
                      </MenuButton>
                      <MenuList 
                        bg="white" 
                        borderColor="blue.200"
                        boxShadow="0 4px 12px rgba(0, 0, 0, 0.1)"
                        zIndex={2}
                        maxH="300px"
                        overflowY="auto"
                      >
                        <MenuItem 
                          onClick={() => setInstitutionFilter('all')}
                          _hover={{ bg: 'blue.50' }}
                          _focus={{ bg: 'blue.50' }}
                        >
                          All Institutions
                        </MenuItem>
                        {institutions.map((institution) => (
                          <MenuItem 
                            key={institution.id_institution}
                            onClick={() => setInstitutionFilter(institution.id_institution.toString())}
                            _hover={{ bg: 'blue.50' }}
                            _focus={{ bg: 'blue.50' }}
                          >
                            {institution.name}
                          </MenuItem>
                        ))}
                      </MenuList>
                    </Menu>
                    <InputGroup maxW="300px">
                      <InputLeftElement pointerEvents="none">
                        <Icon as={FaSearch} color="blue.300" />
                      </InputLeftElement>
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        bg="white"
                        borderColor="blue.200"
                        _hover={{ borderColor: 'blue.300' }}
                        _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px blue.200' }}
                        color="blue.700"
                        _placeholder={{ color: 'blue.300' }}
                      />
                    </InputGroup>
                  </HStack>
                  <HStack spacing={2}>
                    <Text color="blue.700">Users per page:</Text>
                    <NumberInput
                      size="sm"
                      maxW={20}
                      min={1}
                      max={10}
                      value={usersPerPage}
                      onChange={(value) => setUsersPerPage(Number(value))}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </HStack>
                </Flex>

                <Table variant="simple" w="full">
                  <Thead>
                    <Tr>
                      <Th>User</Th>
                      <Th>Email</Th>
                      <Th>Role</Th>
                      <Th 
                        cursor="pointer" 
                        onClick={() => handleSort('institution')}
                        _hover={{ bg: 'gray.100' }}
                      >
                        Institution
                        {sortConfig.key === 'institution' && (
                          <Icon 
                            as={sortConfig.direction === 'ascending' ? FaChevronUp : FaChevronDown} 
                            ml={2} 
                            boxSize={3} 
                          />
                        )}
                      </Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <AnimatePresence initial={false}>
                      {currentUsers.map((user, index) => (
                        <MotionTr
                          key={user.id_user}
                          variants={rowVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          onHoverStart={() => setHoveredRow(user.id_user)}
                          onHoverEnd={() => setHoveredRow(null)}
                          style={{
                            backgroundColor: hoveredRow === user.id_user ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
                            transition: 'background-color 0.2s ease'
                          }}
                        >
                          <MotionTd>
                            <HStack>
                              <Avatar
                                size="sm"
                                name={`${user.prenom} ${user.nom}`}
                                icon={getRoleIcon(user.roles)}
                              />
                              <Text>{user.prenom} {user.nom}</Text>
                            </HStack>
                          </MotionTd>
                          <MotionTd>{user.email}</MotionTd>
                          <MotionTd>
                            <Badge colorScheme={getRoleBadgeColor(user.roles)}>
                              {user.roles}
                            </Badge>
                          </MotionTd>
                          <MotionTd>
                            {user.institution_name || 'No Institution'}
                          </MotionTd>
                          <MotionTd>
                            <Menu>
                              <MenuButton
                                as={IconButton}
                                icon={<FaChevronDown />}
                                variant="ghost"
                                size="sm"
                                color="blue.500"
                                _hover={{ bg: 'blue.50' }}
                                _active={{ bg: 'blue.100' }}
                              />
                              <MenuList 
                                bg="white" 
                                borderColor="blue.200"
                                boxShadow="0 4px 12px rgba(0, 0, 0, 0.1)"
                                zIndex={2}
                              >
                                <MenuItem 
                                  icon={<FaEdit />}
                                  _hover={{ bg: 'blue.50' }}
                                  _focus={{ bg: 'blue.50' }}
                                >
                                  Edit User
                                </MenuItem>
                                <MenuItem 
                                  icon={<FaTrash />} 
                                  color="red.500"
                                  _hover={{ bg: 'red.50' }}
                                  _focus={{ bg: 'red.50' }}
                                >
                                  Delete User
                                </MenuItem>
                              </MenuList>
                            </Menu>
                          </MotionTd>
                        </MotionTr>
                      ))}
                    </AnimatePresence>
                  </Tbody>
                </Table>

                <Flex justify="center" mt={4}>
                  <HStack spacing={2}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                      <Button
                        key={number}
                        onClick={() => paginate(number)}
                        colorScheme={currentPage === number ? 'blue' : 'gray'}
                        variant={currentPage === number ? 'solid' : 'outline'}
                        size="sm"
                      >
                        {number}
                      </Button>
                    ))}
                  </HStack>
                </Flex>
              </VStack>
            </TabPanel>

            <TabPanel>
              <VStack spacing={6} w="full">
                <Flex justify="space-between" w="full" align="center">
                  <Heading size="md" color="blue.700">Institutions List</Heading>
                  <Button
                    colorScheme="blue"
                    leftIcon={<Icon as={FaPlus} />}
                    onClick={() => setIsCreateModalOpen(true)}
                    _hover={{
                      transform: 'translateY(-2px)',
                      boxShadow: 'lg'
                    }}
                  >
                    Add Institution
                  </Button>
                </Flex>

                <Box>
                  <Heading size="lg" mb={6}>Institutions</Heading>
                  <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={6}>
                    {institutions.map((institution) => (
                      <Card
                        key={institution.id_institution}
                        bg={bgColor}
                        border="1px"
                        borderColor={borderColor}
                        _hover={{
                          transform: 'translateY(-4px)',
                          boxShadow: 'lg',
                          transition: 'all 0.2s',
                        }}
                        cursor="pointer"
                        onClick={() => navigate(`/director/institutions/${institution.id_institution}`)}
                        position="relative"
                        overflow="hidden"
                      >
                        <Box
                          position="absolute"
                          top="0"
                          left="0"
                          right="0"
                          h="4px"
                          bgGradient="linear(to-r, blue.500, purple.500)"
                        />
                        <CardHeader>
                          <HStack spacing={4}>
                            <Avatar
                              name={institution.name}
                              bg="blue.500"
                              color="white"
                              size="lg"
                              _hover={{
                                transform: 'scale(1.1)',
                                transition: 'all 0.2s',
                              }}
                            />
                            <VStack align="start" spacing={0}>
                              <Heading size="md" color={headingColor}>{institution.name}</Heading>
                              <Text fontSize="sm" color={textColor}>
                                {institution.email}
                              </Text>
                            </VStack>
                          </HStack>
                        </CardHeader>
                        <CardBody>
                          <VStack align="stretch" spacing={3}>
                            <HStack>
                              <Icon as={FaMapMarkerAlt} color="green.500" />
                              <Text fontSize="sm" color={textColor}>{institution.address}</Text>
                            </HStack>
                            <HStack>
                              <Icon as={FaPhone} color="purple.500" />
                              <Text fontSize="sm" color={textColor}>{institution.phone}</Text>
                            </HStack>
                            <Divider />
                            <HStack justify="space-between">
                              <Box
                                bg="blue.50"
                                p={2}
                                borderRadius="md"
                                _hover={{
                                  bg: 'blue.100',
                                  transition: 'all 0.2s',
                                }}
                              >
                                <Text fontSize="sm" color="blue.600" fontWeight="medium">
                                  {institution.users_count || 0} Users
                                </Text>
                              </Box>
                              <Badge 
                                colorScheme={institution.status === 'active' ? 'green' : 'yellow'}
                                px={2}
                                py={1}
                                borderRadius="md"
                              >
                                {institution.status}
                              </Badge>
                            </HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </Grid>
                </Box>

                <Modal 
                  isOpen={isCreateModalOpen} 
                  onClose={() => setIsCreateModalOpen(false)} 
                  isCentered
                  size="xl"
                >
                  <ModalOverlay 
                    bg="blackAlpha.600"
                    backdropFilter="blur(10px)"
                  />
                  <MotionBox
                    as={ModalContent}
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    bg="white"
                    borderRadius="2xl"
                    overflow="hidden"
                    maxH="80vh"
                  >
                    <Box
                      bgGradient="linear(to-r, blue.500, purple.500)"
                      p={4}
                      color="white"
                    >
                      <ModalHeader fontSize="xl" fontWeight="bold">
                        Create New Institution
                      </ModalHeader>
                      <ModalCloseButton color="white" />
                    </Box>
                    
                    <ModalBody p={4} overflowY="auto">
                      <VStack spacing={3}>
                        <FormControl isRequired>
                          <FormLabel fontSize="sm">Institution Name</FormLabel>
                          <Input
                            value={institutionData.name}
                            onChange={(e) => setInstitutionData({ ...institutionData, name: e.target.value })}
                            placeholder="Enter institution name"
                            size="sm"
                          />
                        </FormControl>
                        
                        <FormControl>
                          <FormLabel fontSize="sm">Location</FormLabel>
                          <Box h="300px" borderRadius="md" overflow="hidden" border="1px solid" borderColor="gray.200">
                            <MapWrapper 
                              onLocationSelect={(location) => {
                                setInstitutionData({
                                  ...institutionData,
                                  location: location,
                                  address: location.display_name
                                });
                              }}
                            />
                          </Box>
                          <Text fontSize="xs" color="gray.500" mt={1}>
                            Search for a street or click on the map to select the exact location
                          </Text>
                        </FormControl>
                        
                        <FormControl>
                          <FormLabel fontSize="sm">Phone</FormLabel>
                          <Input
                            value={institutionData.phone}
                            onChange={(e) => setInstitutionData({ ...institutionData, phone: e.target.value })}
                            placeholder="Enter institution phone"
                            size="sm"
                          />
                        </FormControl>
                        
                        <FormControl>
                          <FormLabel fontSize="sm">Email</FormLabel>
                          <Input
                            value={institutionData.email}
                            onChange={(e) => setInstitutionData({ ...institutionData, email: e.target.value })}
                            placeholder="Enter institution email"
                            size="sm"
                          />
                        </FormControl>

                        <Divider my={2} />

                        <Heading size="sm">Superadmin Details</Heading>

                        <FormControl isRequired>
                          <FormLabel fontSize="sm">First Name</FormLabel>
                          <Input
                            value={institutionData.superadmin.firstName}
                            onChange={(e) => setInstitutionData({
                              ...institutionData,
                              superadmin: { ...institutionData.superadmin, firstName: e.target.value }
                            })}
                            placeholder="Enter superadmin first name"
                            size="sm"
                          />
                        </FormControl>

                        <FormControl isRequired>
                          <FormLabel fontSize="sm">Last Name</FormLabel>
                          <Input
                            value={institutionData.superadmin.lastName}
                            onChange={(e) => setInstitutionData({
                              ...institutionData,
                              superadmin: { ...institutionData.superadmin, lastName: e.target.value }
                            })}
                            placeholder="Enter superadmin last name"
                            size="sm"
                          />
                        </FormControl>

                        <FormControl isRequired isInvalid={!!errors.email}>
                          <FormLabel fontSize="sm">Email</FormLabel>
                          <Input
                            value={institutionData.superadmin.email}
                            onChange={(e) => setInstitutionData({
                              ...institutionData,
                              superadmin: { ...institutionData.superadmin, email: e.target.value }
                            })}
                            placeholder="Enter superadmin email"
                            size="sm"
                          />
                          {errors.email && (
                            <Text color="red.500" fontSize="xs" mt={1}>
                              {errors.email}
                            </Text>
                          )}
                        </FormControl>

                        <FormControl isRequired>
                          <FormLabel fontSize="sm">Phone</FormLabel>
                          <Input
                            value={institutionData.superadmin.phone}
                            onChange={(e) => setInstitutionData({
                              ...institutionData,
                              superadmin: { ...institutionData.superadmin, phone: e.target.value }
                            })}
                            placeholder="Enter superadmin phone"
                            size="sm"
                          />
                        </FormControl>

                        <FormControl isRequired isInvalid={!!errors.password}>
                          <FormLabel fontSize="sm">Password</FormLabel>
                          <Input
                            type="password"
                            value={institutionData.superadmin.password}
                            onChange={(e) => setInstitutionData({
                              ...institutionData,
                              superadmin: { ...institutionData.superadmin, password: e.target.value }
                            })}
                            placeholder="Enter superadmin password"
                            size="sm"
                          />
                          {errors.password && (
                            <Text color="red.500" fontSize="xs" mt={1}>
                              {errors.password}
                            </Text>
                          )}
                        </FormControl>

                        <FormControl isRequired isInvalid={!!errors.confirmPassword}>
                          <FormLabel fontSize="sm">Confirm Password</FormLabel>
                          <Input
                            type="password"
                            value={institutionData.superadmin.confirmPassword}
                            onChange={(e) => setInstitutionData({
                              ...institutionData,
                              superadmin: { ...institutionData.superadmin, confirmPassword: e.target.value }
                            })}
                            placeholder="Confirm superadmin password"
                            size="sm"
                          />
                          {errors.confirmPassword && (
                            <Text color="red.500" fontSize="xs" mt={1}>
                              {errors.confirmPassword}
                            </Text>
                          )}
                        </FormControl>
                      </VStack>
                    </ModalBody>

                    <ModalFooter p={3} bg="gray.50">
                      <HStack spacing={3}>
                        <MotionButton
                          variant="ghost"
                          onClick={() => setIsCreateModalOpen(false)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          size="sm"
                        >
                          Cancel
                        </MotionButton>
                        <MotionButton
                          colorScheme="blue"
                          onClick={createInstitution}
                          isLoading={isLoading}
                          loadingText="Creating..."
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          size="sm"
                        >
                          Create Institution
                        </MotionButton>
                      </HStack>
                    </ModalFooter>
                  </MotionBox>
                </Modal>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
};

export default Users; 