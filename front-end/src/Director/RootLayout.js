import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { 
  Box, 
  Flex, 
  Button, 
  Text, 
  Icon,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useToast,
  IconButton,
} from '@chakra-ui/react';
import { 
  FaSignOutAlt, 
  FaUserCircle,
  FaBars,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { backend } from '../config';

const MotionBox = motion(Box);

const DirectorRootLayout = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Navbar pentru director*/}
      <Box
        as="header"
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={2}
        bg="white"
        borderBottom="1px"
        borderColor="gray.100"
        boxShadow="sm"
        h="50px"
        backdropFilter="blur(8px)"
        bgGradient="linear(to-r, white, blue.50)"
      >
        <Flex
          align="center"
          justify="space-between"
          h="full"
          w="full"
          px={4}
        >
          {/* Left side - Hamburger Menu */}
          <IconButton
            icon={<FaBars />}
            variant="ghost"
            colorScheme="blue"
            aria-label="Toggle Sidebar"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            _hover={{ 
              bg: 'blue.100',
              transform: 'scale(1.05)'
            }}
            _active={{ bg: 'blue.200' }}
            borderRadius="full"
            size="sm"
            ml={2}
          />

          {/* Right side - User Menu */}
          <Menu>
            <MenuButton
              as={Button}
              variant="ghost"
              _hover={{ 
                bg: 'blue.100',
                transform: 'scale(1.05)'
              }}
              _active={{ bg: 'blue.200' }}
              borderRadius="full"
              size="sm"
              mr={2}
            >
              <Avatar
                size="xs"
                icon={<FaUserCircle />}
                bg="blue.500"
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
                onClick={() => navigate('/director/profile')}
                _hover={{ bg: 'blue.50' }}
                _focus={{ bg: 'blue.50' }}
              >
                <Icon as={FaUserCircle} mr={2} color="blue.500" />
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
        </Flex>
      </Box>

      {/* Main Content */}
      <Flex>
        {/* Sidebar with Animation */}
        <AnimatePresence>
          {isSidebarOpen && (
            <MotionBox
              position="fixed"
              left={0}
              top="50px"
              bottom={0}
              width="220px"
              zIndex={1}
              initial={{ x: -220 }}
              animate={{ x: 0 }}
              exit={{ x: -220 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              bg="white"
              borderRight="1px"
              borderColor="gray.100"
              boxShadow="sm"
              bgGradient="linear(to-b, white, blue.50)"
            >
              <Sidebar />
            </MotionBox>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <Box 
          flex="1" 
          ml={isSidebarOpen ? "220px" : "0"}
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

export default DirectorRootLayout; 