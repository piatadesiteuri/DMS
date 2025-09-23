import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Box,
  VStack,
  Text,
  Icon,
  useColorModeValue,
  Flex,
  Tooltip,
} from '@chakra-ui/react';
import { 
  FaHome,
  FaFileAlt,
  FaUsers,
  FaCog,
  FaChartBar,
  FaFolder,
  FaBell,
  FaCrown,
} from 'react-icons/fa';

const menuItems = [
  { name: 'Dashboard', icon: FaHome, path: '/director/dashboard' },
  { name: 'Documents', icon: FaFileAlt, path: '/director/documents' },
  { name: 'Users', icon: FaUsers, path: '/director/users' },
  { name: 'Folders', icon: FaFolder, path: '/director/folders' },
  { name: 'Statistics', icon: FaChartBar, path: '/director/statistics' },
  { name: 'Plans', icon: FaCrown, path: '/director/plans' },
  { name: 'Notifications', icon: FaBell, path: '/director/notifications' },
  { name: 'Settings', icon: FaCog, path: '/director/settings' },
];

const Sidebar = () => {
  const location = useLocation();
  const activeColor = useColorModeValue('blue.500', 'blue.200');
  const hoverBg = useColorModeValue('blue.50', 'blue.900');
  const textColor = useColorModeValue('gray.600', 'gray.300');

  return (
    <Box h="full" py={4}>
      <VStack spacing={1} align="stretch">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Tooltip
              key={item.name}
              label={item.name}
              placement="right"
              hasArrow
              bg="blue.500"
              color="white"
            >
              <Link to={item.path}>
                <Flex
                  align="center"
                  p={3}
                  mx={2}
                  borderRadius="lg"
                  role="group"
                  cursor="pointer"
                  bg={isActive ? 'blue.50' : 'transparent'}
                  color={isActive ? activeColor : textColor}
                  _hover={{
                    bg: hoverBg,
                    color: activeColor,
                    transform: 'translateX(4px)',
                  }}
                  transition="all 0.2s"
                >
                  <Icon
                    as={item.icon}
                    mr={4}
                    fontSize="16"
                    _groupHover={{
                      color: activeColor,
                    }}
                  />
                  <Text fontSize="sm" fontWeight={isActive ? 'bold' : 'normal'}>
                    {item.name}
                  </Text>
                </Flex>
              </Link>
            </Tooltip>
          );
        })}
      </VStack>
    </Box>
  );
};

export default Sidebar; 