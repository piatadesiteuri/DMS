import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { backend } from '../config';
import { 
  Box, 
  Flex, 
  Button, 
  Text, 
  useColorModeValue,
  Icon,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  HStack,
  VStack,
  useDisclosure,
  Input,
  InputGroup,
  InputLeftElement,
  useToast,
  IconButton,
  Badge,
  Divider,
  Center,
  Spinner,
  AlertIcon,
  Alert,
  AlertDescription,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ButtonGroup,
} from '@chakra-ui/react';
import { 
  FaSignOutAlt, 
  FaUserCircle,
  FaBars,
  FaBell,
  FaCheck,
  FaTimes,
  FaEye,
  FaCalendarAlt,
  FaDatabase,
  FaHome,
  FaUsers,
  FaFileAlt,
  FaChartBar,
  FaCog,
  FaMoneyBillWave,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../services/notificationService';

const MotionBox = motion(Box);

const SuperAdminRootLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { notifications, unreadCount, markAsRead, isConnected } = useNotifications();

  // Force refresh of notification count
  useEffect(() => {
    console.log('Navbar - Notifications updated:', notifications.length);
    console.log('Navbar - Unread count:', unreadCount);
  }, [notifications, unreadCount]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const { isOpen: isNotificationModalOpen, onOpen: onNotificationModalOpen, onClose: onNotificationModalClose } = useDisclosure();
  const [actionLoading, setActionLoading] = useState(false);

  // Navigation menu items
  const menuItems = [
    { path: '/superadmin', label: 'Dashboard', icon: FaHome },
    { path: '/superadmin/users', label: 'Users', icon: FaUsers },
    { path: '/superadmin/documents', label: 'Documents', icon: FaFileAlt },
    { path: '/superadmin/statistics', label: 'Statistics', icon: FaChartBar },
    { path: '/superadmin/notifications', label: 'Notifications', icon: FaBell },
    { path: '/superadmin/storage', label: 'Storage', icon: FaCog },
    { path: '/superadmin/plans', label: 'Pricing Plans', icon: FaMoneyBillWave },
  ];

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  // Check if we're in the documents page
  const isDocumentsPage = location.pathname === '/superadmin/documents';

  const handleLogout = async () => {
    try {
      const response = await fetch(`${backend}/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          "Origin": window.location.origin
        }
      });
      
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userRole');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout failed',
        description: 'There was an error logging out. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  const handleNotificationClick = async (notification) => {
    setSelectedNotification(notification);
    onNotificationModalOpen();
    
    // Mark as read when clicked if it's not already approved
    if (notification.status === 'pending') {
      await markAsRead(notification.id_request);
    }
  };

  const handleAction = async (action) => {
    if (!selectedNotification) return;

    setActionLoading(true);
    try {
      const response = await fetch(`${backend}/api/post_docs/superadmin/notifications/${selectedNotification.id_request}/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} notification`);
      }

      toast({
        title: action === 'approve' ? 'Notification Approved' : 'Notification Rejected',
        description: `The notification has been ${action}d successfully.`,
        status: action === 'approve' ? 'success' : 'info',
        duration: 3000,
        isClosable: true,
      });

      onNotificationModalClose();
    } catch (err) {
      console.error('Error processing action:', err);
      toast({
        title: 'Error',
        description: err.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Recent';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) return 'acum';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
      return `${Math.floor(diffInSeconds / 86400)}d`;
    } catch (error) {
      return 'Recent';
    }
  };

  const getNotificationText = (notification) => {
    if (!notification) return '';
    
    const userName = notification.userName || 'Unknown User';
    if (notification.type === 'storage_upgrade') {
      return `${userName} solicită îmbunătățire stocare`;
    }
    return `${userName} solicită upload document`;
  };

  // Get pending notifications for dropdown
  const pendingNotifications = notifications.filter(n => n.status === 'pending').slice(0, 5);

  return (
    <Box 
      minH="100vh" 
      bg="gray.50"
      position="relative"
      _before={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgImage: `
          radial-gradient(circle at 25% 25%, rgba(139, 92, 246, 0.03) 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.04) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(147, 51, 234, 0.02) 0%, transparent 50%)
        `,
        pointerEvents: 'none'
      }}
      _after={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgImage: `
          linear-gradient(45deg, transparent 40%, rgba(139, 92, 246, 0.02) 50%, transparent 60%),
          linear-gradient(-45deg, transparent 40%, rgba(168, 85, 247, 0.02) 50%, transparent 60%)
        `,
        bgSize: '80px 80px, 80px 80px',
        pointerEvents: 'none'
      }}
    >
      {/* Navbar */}
      <Box
        as="header"
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={2}
        bg="white"
        borderBottom="1px"
        borderColor="gray.200"
        boxShadow="0 1px 3px rgba(0, 0, 0, 0.1)"
        h="56px"
        backdropFilter="blur(10px)"
      >
        <Flex
          align="center"
          justify="space-between"
          h="full"
          w="full"
          px={4}
        >
          {/* Left side - Hamburger Menu + Navigation */}
          <HStack spacing={4}>
            {/* Show hamburger menu only on documents page */}
            {isDocumentsPage && (
              <IconButton
                icon={<FaBars />}
                variant="ghost"
                colorScheme="gray"
                aria-label="Toggle Sidebar"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                size="sm"
                borderRadius="md"
                _hover={{ 
                  bg: 'gray.100'
                }}
              />
            )}

            {/* Navigation Menu Items */}
            <HStack spacing={2} display={{ base: 'none', lg: 'flex' }}>
              {menuItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  size="sm"
                  leftIcon={<Icon as={item.icon} />}
                  onClick={() => navigate(item.path)}
                  color={isActiveRoute(item.path) ? 'purple.600' : 'gray.600'}
                  bg={isActiveRoute(item.path) ? 'purple.50' : 'transparent'}
                  _hover={{
                    bg: isActiveRoute(item.path) ? 'purple.100' : 'gray.100',
                    color: isActiveRoute(item.path) ? 'purple.700' : 'gray.800'
                  }}
                  _active={{
                    bg: isActiveRoute(item.path) ? 'purple.200' : 'gray.200'
                  }}
                  borderRadius="md"
                  fontWeight="medium"
                  transition="all 0.2s"
                >
                  {item.label}
                </Button>
              ))}
            </HStack>
          </HStack>

          {/* Center/Right side - Notifications Bell + User Menu */}
          <HStack spacing={3}>
            {/* Notifications Bell */}
            <Menu>
              <Tooltip 
                label={`${unreadCount} notificări necitite`} 
                placement="bottom"
                fontSize="xs"
              >
                <Box position="relative" display="inline-block">
                  <MenuButton
                    as={IconButton}
                    icon={<FaBell />}
                    variant="ghost"
                    aria-label="Notifications"
                    size="sm"
                    borderRadius="md"
                    color="gray.600"
                    _hover={{ 
                      bg: 'gray.100',
                      color: 'gray.800'
                    }}
                  />
                  {unreadCount > 0 && (
                    <Badge
                      position="absolute"
                      top="-4px"
                      right="-4px"
                      colorScheme="red"
                      variant="solid"
                      borderRadius="full"
                      px={1}
                      py={0}
                      fontSize="xs"
                      fontWeight="600"
                      minW="18px"
                      h="18px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      border="2px solid white"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Box>
              </Tooltip>
              <MenuList 
                minW="320px"
                maxW="360px"
                boxShadow="0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
                border="1px solid"
                borderColor="gray.200"
                borderRadius="lg"
                py={2}
                bg="white"
              >
                <Box px={4} py={2} borderBottomWidth="1px" borderColor="gray.100">
                  <HStack justify="space-between" align="center">
                    <Text fontSize="sm" fontWeight="600" color="gray.800">
                      Notificări
                    </Text>
                    <HStack spacing={2}>
                      <Badge 
                        colorScheme={isConnected ? "green" : "red"} 
                        fontSize="xs" 
                        px={2} 
                        py={0.5} 
                        borderRadius="md"
                        variant="subtle"
                      >
                        {isConnected ? "Online" : "Offline"}
                      </Badge>
                      {unreadCount > 0 && (
                        <Badge 
                          colorScheme="blue" 
                          fontSize="xs" 
                          px={2} 
                          py={0.5} 
                          borderRadius="md"
                        >
                          {unreadCount}
                        </Badge>
                      )}
                    </HStack>
                  </HStack>
                </Box>

                {pendingNotifications.length === 0 ? (
                  <Center py={6}>
                    <VStack spacing={2}>
                      <Icon as={FaBell} boxSize={4} color="gray.400" />
                      <Text fontSize="sm" color="gray.500">
                        Nicio notificare nouă
                      </Text>
                    </VStack>
                  </Center>
                ) : (
                  <VStack spacing={0} align="stretch" maxH="280px" overflowY="auto">
                    {pendingNotifications.map((notification, index) => (
                      <MenuItem
                        key={notification.id_request}
                        px={4}
                        py={3}
                        _hover={{ bg: 'gray.50' }}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <HStack spacing={3} w="full" align="start">
                          <Box
                            w={2}
                            h={2}
                            borderRadius="full"
                            bg="blue.500"
                            mt={2}
                            flexShrink={0}
                          />
                          <VStack align="start" spacing={1} flex={1} minW={0}>
                            <Text 
                              fontSize="sm" 
                              fontWeight="500" 
                              color="gray.800"
                              noOfLines={1}
                            >
                              {getNotificationText(notification)}
                            </Text>
                            <HStack spacing={2}>
                              <Badge 
                                colorScheme={notification.type === 'storage_upgrade' ? 'purple' : 'blue'}
                                fontSize="xs"
                                px={2}
                                py={0.5}
                                borderRadius="md"
                                variant="subtle"
                              >
                                {notification.type === 'storage_upgrade' ? 'Stocare' : 'Upload'}
                              </Badge>
                              <Text fontSize="xs" color="gray.500">
                                {formatTimeAgo(notification.timestamp)}
                              </Text>
                            </HStack>
                          </VStack>
                        </HStack>
                      </MenuItem>
                    ))}
                  </VStack>
                )}

                {pendingNotifications.length > 0 && (
                  <>
                    <Box borderTopWidth="1px" borderColor="gray.100" mt={1} />
                    <MenuItem
                      px={4}
                      py={2}
                      _hover={{ bg: 'gray.50' }}
                      justifyContent="center"
                      color="blue.600"
                      fontWeight="500"
                      onClick={() => navigate('/superadmin/notifications')}
                    >
                      <HStack spacing={2}>
                        <Icon as={FaEye} boxSize={3} />
                        <Text fontSize="sm">Vezi toate</Text>
                      </HStack>
                    </MenuItem>
                  </>
                )}
              </MenuList>
            </Menu>

            {/* User Profile Menu */}
            <Menu>
              <MenuButton
                as={Button}
                variant="ghost"
                _hover={{ 
                  bg: 'purple.100',
                  transform: 'scale(1.05)'
                }}
                _active={{ bg: 'purple.200' }}
                borderRadius="full"
                size="sm"
                mr={2}
              >
                <Avatar
                  size="xs"
                  icon={<FaUserCircle />}
                  bg="purple.500"
                  color="white"
                  boxShadow="sm"
                />
              </MenuButton>
              <MenuList 
                minW="200px"
                boxShadow="lg"
                border="none"
                borderRadius="lg"
                py={2}
                bg="white"
              >
                <MenuItem 
                  onClick={() => navigate('/superadmin/profile')}
                  _hover={{ bg: 'purple.50' }}
                  _focus={{ bg: 'purple.50' }}
                >
                  <Icon as={FaUserCircle} mr={2} color="purple.500" />
                  <Text fontSize="sm">Profile</Text>
                </MenuItem>
                <MenuDivider borderColor="gray.100" />
                <MenuItem 
                  onClick={handleLogout}
                  _hover={{ bg: 'red.50' }}
                  _focus={{ bg: 'red.50' }}
                >
                  <Icon as={FaSignOutAlt} mr={2} color="red.500" />
                  <Text fontSize="sm" color="red.500">Logout</Text>
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>
      </Box>

      {/* Notification Detail Modal */}
      <Modal 
        isOpen={isNotificationModalOpen} 
        onClose={onNotificationModalClose} 
        size="xl"
        motionPreset="slideInBottom"
      >
        <ModalOverlay 
          bg="blackAlpha.300"
          backdropFilter="blur(10px)"
        />
        <MotionBox
          as={ModalContent}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          borderRadius="xl"
          overflow="hidden"
        >
          <ModalHeader 
            bg="purple.500"
            color="white"
            fontSize="xl"
            fontWeight="bold"
            py={4}
          >
            Detalii notificare
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody p={6}>
            {selectedNotification && (
              <VStack spacing={6} align="stretch">
                <Box
                  p={4}
                  borderRadius="lg"
                  bg="gray.50"
                  borderWidth="1px"
                  borderColor="gray.200"
                >
                  <VStack align="start" spacing={3}>
                    <HStack spacing={2}>
                      <Avatar 
                        name={selectedNotification.userName}
                        size="sm"
                        bg="purple.500"
                      />
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="bold" fontSize="lg">
                          {selectedNotification.userName || 'Utilizator necunoscut'}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          {selectedNotification.userEmail}
                        </Text>
                      </VStack>
                    </HStack>
                    <Divider />
                    <HStack spacing={4} w="full">
                      <Box flex={1}>
                        <Text fontSize="sm" color="gray.500" mb={1}>Utilizare curentă</Text>
                        <Text fontWeight="medium">{selectedNotification.current_usage} MB</Text>
                      </Box>
                      <Box flex={1}>
                        <Text fontSize="sm" color="gray.500" mb={1}>Limită de plan</Text>
                        <Text fontWeight="medium">{selectedNotification.plan_limit} MB</Text>
                      </Box>
                    </HStack>
                  </VStack>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={2}>Detalii cerere</Text>
                  <Box
                    p={4}
                    borderRadius="lg"
                    bg="gray.50"
                    borderWidth="1px"
                    borderColor="gray.200"
                  >
                    <Text>{selectedNotification.reason || 'Nu sunt disponibile detalii suplimentare.'}</Text>
                  </Box>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={2}>Data cererii</Text>
                  <Text color="gray.600">
                    {selectedNotification.timestamp ? 
                      new Date(selectedNotification.timestamp).toLocaleString('ro-RO') : 
                      'Data necunoscută'
                    }
                  </Text>
                </Box>
              </VStack>
            )}
          </ModalBody>
          
          {selectedNotification?.status === 'pending' && (
            <ModalFooter 
              p={4}
              borderTopWidth="1px"
              borderColor="gray.200"
            >
              <ButtonGroup spacing={4}>
                <Button
                  colorScheme="green"
                  onClick={() => handleAction('approve')}
                  isLoading={actionLoading}
                  loadingText="Aprobare..."
                  leftIcon={<Icon as={FaCheck} />}
                  _hover={{ transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                >
                  Aprobare
                </Button>
                <Button
                  colorScheme="red"
                  onClick={() => handleAction('reject')}
                  isLoading={actionLoading}
                  loadingText="Refuzare..."
                  leftIcon={<Icon as={FaTimes} />}
                  _hover={{ transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                >
                  Refuză
                </Button>
              </ButtonGroup>
            </ModalFooter>
          )}
        </MotionBox>
      </Modal>

      {/* Main Content */}
      <Flex>
        {/* Sidebar - Only show on documents page */}
        {isDocumentsPage && isSidebarOpen && (
          <Box
            position="fixed"
            left={0}
            top="50px"
            bottom={0}
            width="220px"
            zIndex={1}
            bg="transparent"
          >
            <Sidebar />
          </Box>
        )}

        {/* Main Content Area */}
        <Box 
          flex="1" 
          ml={isDocumentsPage && isSidebarOpen ? "220px" : "0"}
          p={6}
          minH="calc(100vh - 50px)"
          mt="50px"
          transition="margin-left 0.3s ease-in-out"
        >
          <Outlet />
        </Box>
      </Flex>
    </Box>
  );
};

export default SuperAdminRootLayout;