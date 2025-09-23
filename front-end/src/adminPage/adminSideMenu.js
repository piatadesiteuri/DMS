import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Box,
  VStack,
  Button,
  Icon,
  Text,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  Flex,
  Avatar,
  Badge,
  MenuGroup,
  MenuDivider,
  Center,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FiHome,
  FiUsers,
  FiFile,
  FiArchive,
  FiBarChart2,
  FiLogOut,
  FiChevronDown,
  FiUserPlus,
  FiUserCheck,
  FiBell,
  FiFolder,
  FiFileText,
  FiUpload,
} from 'react-icons/fi';
import { useNotifications } from '../services/notificationService';
import { backend } from '../config';
const AdminSideMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [selectedNotification, setSelectedNotification] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  console.log('AdminSideMenu - Current notifications:', notifications);
  console.log('AdminSideMenu - Unread count:', unreadCount);

  const handleLogout = async () => {
    try {
      const response = await fetch(`${backend}/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userRole');
      window.location.href = "/login";
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Professional color scheme
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const activeColor = useColorModeValue('blue.600', 'blue.300');
  const hoverBg = useColorModeValue('blue.50', 'gray.700');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');
  const menuBg = useColorModeValue('white', 'gray.800');
  const menuBorder = useColorModeValue('gray.200', 'gray.600');
  const menuHover = useColorModeValue('blue.50', 'gray.700');
  const menuActive = useColorModeValue('blue.100', 'gray.600');
  const navbarBg = useColorModeValue('white', 'gray.800');
  const navbarBorder = useColorModeValue('gray.100', 'gray.700');
  const logoBg = useColorModeValue('blue.50', 'blue.900');
  const logoColor = useColorModeValue('blue.600', 'blue.300');

  const isActive = (path) => location.pathname === path;

  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Listen for new notifications
  useEffect(() => {
    console.log('AdminSideMenu - Notifications updated:', notifications);
  }, [notifications]);

  const handleNotificationClick = async (notification) => {
    setSelectedNotification(notification);
    onOpen();
    
    // Mark notification as read
    if (!notification.read) {
      await markAsRead(notification._id);
    }
  };

  const handleCloseModal = () => {
    onClose();
    setSelectedNotification(null);
  };

  return (
    <Box display="flex" flexDirection="column" h="100vh">
      {/* Navbar */}
      <Box
        h="70px"
        bg={navbarBg}
        borderBottom="1px"
        borderColor={navbarBorder}
        px={6}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        position="sticky"
        top={0}
        zIndex={2}
        boxShadow="sm"
      >
        <Box w="280px">
          <Flex alignItems="center" gap={3}>
            <Center
              h="40px"
              w="40px"
              bg={logoBg}
              borderRadius="lg"
              boxShadow="sm"
              position="relative"
            >
              <Icon as={FiFolder} boxSize="20px" color={logoColor} />
              <Icon
                as={FiFileText}
                boxSize="16px"
                color={logoColor}
                position="absolute"
                top="12px"
                right="8px"
              />
            </Center>
            <Text
              fontSize="xl"
              fontWeight="bold"
              color={logoColor}
              letterSpacing="tight"
            >
              DMS
            </Text>
          </Flex>
        </Box>

        <Flex alignItems="center" gap={4}>
          {/* Notifications */}
          <Menu>
            <MenuButton
              as={Button}
              variant="ghost"
              position="relative"
              _hover={{ bg: hoverBg }}
              _active={{ bg: menuActive }}
              borderRadius="full"
              p={2}
            >
              <Icon as={FiBell} boxSize="20px" color={textColor} />
              {unreadCount > 0 && (
                <Badge
                  colorScheme="red"
                  position="absolute"
                  top="-1"
                  right="-1"
                  borderRadius="full"
                  fontSize="xs"
                  boxShadow="sm"
                >
                  {unreadCount}
                </Badge>
              )}
            </MenuButton>
            <MenuList
              bg={menuBg}
              borderColor={menuBorder}
              boxShadow="lg"
              minW="300px"
              py={2}
              borderRadius="md"
              maxH="400px"
              overflowY="auto"
            >
              <MenuGroup title="Notifications" px={3} py={1}>
                {notifications.length === 0 ? (
                  <MenuItem
                    py={2}
                    _hover={{ bg: menuHover }}
                    _active={{ bg: menuActive }}
                    justifyContent="center"
                  >
                    <Text color={subTextColor}>No new notifications</Text>
                  </MenuItem>
                ) : (
                  <>
                    {notifications.slice(0, 5).map((notification) => (
                      <MenuItem
                        key={notification.id_request}
                        onClick={() => handleNotificationClick(notification)}
                        bg={notification.status === 'pending' ? 'blue.50' : 'white'}
                        _hover={{ bg: notification.status === 'pending' ? 'blue.100' : 'gray.100' }}
                        p={3}
                        borderRadius="md"
                        mb={2}
                      >
                        <VStack align="start" spacing={1} w="full">
                          <Text fontWeight={notification.status === 'pending' ? 'bold' : 'normal'}>
                            {notification.type === 'storage_upgrade' ? 'Storage Upgrade Request' : 'Upload Request'}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            {new Date(notification.timestamp).toLocaleString()}
                          </Text>
                        </VStack>
                      </MenuItem>
                    ))}
                    {notifications.length > 5 && (
                      <MenuItem
                        py={2}
                        _hover={{ bg: menuHover }}
                        _active={{ bg: menuActive }}
                        justifyContent="center"
                        color={activeColor}
                        onClick={() => navigate('/admin/notifications')}
                      >
                        <Text>View More ({notifications.length - 5} more)</Text>
                      </MenuItem>
                    )}
                  </>
                )}
              </MenuGroup>
            </MenuList>
          </Menu>

          {/* User Profile */}
          <Menu>
            <MenuButton
              as={Button}
              variant="ghost"
              _hover={{ bg: hoverBg }}
              _active={{ bg: menuActive }}
              borderRadius="full"
              p={1}
            >
              <Avatar
                size="sm"
                name="Admin User"
                bg={activeColor}
                color="white"
                boxShadow="sm"
              />
            </MenuButton>
            <MenuList
              bg={menuBg}
              borderColor={menuBorder}
              boxShadow="lg"
              minW="200px"
              py={2}
              borderRadius="md"
            >
              <MenuItem
                py={2}
                _hover={{ bg: menuHover }}
                _active={{ bg: menuActive }}
              >
                <Text>Profile Settings</Text>
              </MenuItem>
              <MenuItem
                py={2}
                _hover={{ bg: menuHover }}
                _active={{ bg: menuActive }}
              >
                <Text>Account Settings</Text>
              </MenuItem>
              <MenuDivider />
              <MenuItem
                py={2}
                _hover={{ bg: menuHover }}
                _active={{ bg: menuActive }}
                onClick={handleLogout}
              >
                <Text>Logout</Text>
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Box>

      {/* Main Content Area with Sidebar */}
      <Box display="flex" flex="1" overflow="hidden">
        {/* Sidebar */}
      <Box
        w="280px"
        bg={bgColor}
        borderRight="1px"
        borderColor={borderColor}
        py={6}
        px={4}
          position="relative"
        overflowY="auto"
      >
        <VStack spacing={6} align="stretch">
          {/* Navigation */}
          <VStack spacing={1} align="stretch" flex={1} overflowY="auto" py={4}>
            <Button
              variant="ghost"
              justifyContent="flex-start"
              leftIcon={<Icon as={FiHome} />}
              isActive={isActive('/admin/dashboard')}
              onClick={() => navigate('/admin/dashboard')}
              _hover={{ bg: hoverBg }}
              _active={{ bg: menuActive }}
            >
              Dashboard
            </Button>

            <Button
              variant="ghost"
              justifyContent="flex-start"
              leftIcon={<Icon as={FiUpload} />}
              isActive={isActive('/admin/upload')}
              onClick={() => navigate('/admin/upload')}
              _hover={{ bg: hoverBg }}
              _active={{ bg: menuActive }}
            >
              Upload Documents
            </Button>

            <Button
              variant="ghost"
              justifyContent="flex-start"
              leftIcon={<Icon as={FiFileText} />}
              isActive={isActive('/admin/search')}
              onClick={() => navigate('/admin/search')}
              _hover={{ bg: hoverBg }}
              _active={{ bg: menuActive }}
            >
              Search Documents
            </Button>

            <Button
              variant="ghost"
              justifyContent="flex-start"
              leftIcon={<Icon as={FiBarChart2} />}
              isActive={isActive('/admin/statistics')}
              onClick={() => navigate('/admin/statistics')}
              _hover={{ bg: hoverBg }}
              _active={{ bg: menuActive }}
            >
              Statistics
            </Button>

            <Button
              variant="ghost"
              justifyContent="flex-start"
              leftIcon={<Icon as={FiUsers} />}
              isActive={isActive('/admin/users')}
              onClick={() => navigate('/admin/users')}
              _hover={{ bg: hoverBg }}
              _active={{ bg: menuActive }}
            >
              Manage Users
            </Button>

            <Button
              variant="ghost"
              justifyContent="flex-start"
              leftIcon={<Icon as={FiUserPlus} />}
              isActive={isActive('/admin/create-user')}
              onClick={() => navigate('/admin/create-user')}
              _hover={{ bg: hoverBg }}
              _active={{ bg: menuActive }}
            >
              Create User
            </Button>

            <Button
              variant="ghost"
              justifyContent="flex-start"
              leftIcon={<Icon as={FiFile} />}
              isActive={isActive('/admin/documents')}
              onClick={() => navigate('/admin/documents')}
              _hover={{ bg: hoverBg }}
              _active={{ bg: menuActive }}
            >
              Documents
            </Button>

            <Button
              variant="ghost"
              justifyContent="flex-start"
              leftIcon={<Icon as={FiBell} />}
              isActive={isActive('/admin/notifications')}
              onClick={() => navigate('/admin/notifications')}
              _hover={{ bg: hoverBg }}
              _active={{ bg: menuActive }}
            >
              Notifications
            </Button>
          </VStack>

            <Divider borderColor={borderColor} mt="auto" />

          {/* Logout Button */}
            <Button
              w="full"
              variant="ghost"
              justifyContent="flex-start"
              alignItems="center"
              height="48px"
              borderRadius="md"
              px={4}
              leftIcon={<Icon as={FiLogOut} boxSize="20px" />}
              color={textColor}
              _hover={{ bg: hoverBg, color: activeColor }}
              _active={{ bg: menuActive }}
            onClick={handleLogout}
              fontWeight="medium"
          >
              <Text fontSize="md">Logout</Text>
            </Button>
        </VStack>
      </Box>

      {/* Main Content */}
      <Box
        flex="1"
        overflow="auto"
        bg={useColorModeValue('gray.50', 'gray.900')}
        p={6}
      >
        <Outlet />
      </Box>
      </Box>

      {/* Notification Modal */}
      <Modal isOpen={isOpen} onClose={handleCloseModal} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Flex align="center" gap={2}>
              <Icon as={FiBell} color={activeColor} />
              <Text>Notification Details</Text>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedNotification && (
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Text fontWeight="bold">Type:</Text>
                  <Text>{selectedNotification.type === 'storage_upgrade' ? 'Storage Upgrade Request' : 'Upload Request'}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">User:</Text>
                  <Text>{selectedNotification.userName}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Current Usage:</Text>
                  <Text>{selectedNotification.current_usage}MB</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Plan Limit:</Text>
                  <Text>{selectedNotification.plan_limit}MB</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Reason:</Text>
                  <Text>{selectedNotification.reason}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Time:</Text>
                  <Text>{formatTimeAgo(selectedNotification.timestamp)}</Text>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={handleCloseModal}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AdminSideMenu;
