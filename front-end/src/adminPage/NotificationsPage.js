import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Text,
  HStack,
  Badge,
  Button,
  useColorModeValue,
  Spinner,
  Center,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../services/notificationService';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, markAsRead } = useNotifications();
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedNotification, setSelectedNotification] = useState(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleNotificationClick = async (notification) => {
    setSelectedNotification(notification);
    await markAsRead(notification._id);
    onOpen();
  };

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" align="center">
          <Text fontSize="2xl" fontWeight="bold" color={textColor}>
            Notifications
          </Text>
          <Button
            variant="ghost"
            colorScheme="blue"
            onClick={() => navigate('/admin/dashboard')}
          >
            Back to Dashboard
          </Button>
        </HStack>

        <Box
          bg={bgColor}
          borderRadius="lg"
          boxShadow="md"
          p={6}
          border="1px"
          borderColor={borderColor}
        >
          {notifications.length === 0 ? (
            <Center py={10}>
              <Text color={subTextColor}>No notifications found</Text>
            </Center>
          ) : (
            <VStack spacing={4} align="stretch">
              {notifications.map((notification) => (
                <Box
                  key={notification._id}
                  p={4}
                  borderRadius="md"
                  bg={notification.status === 'pending' ? 'blue.50' : 'white'}
                  border="1px"
                  borderColor={borderColor}
                  cursor="pointer"
                  _hover={{ bg: notification.status === 'pending' ? 'blue.100' : 'gray.50' }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <VStack align="start" spacing={2}>
                    <HStack justify="space-between" w="full">
                      <Text fontWeight="bold">
                        {notification.type === 'storage_upgrade' ? 'Storage Upgrade Request' : 'Upload Request'}
                      </Text>
                      <Badge
                        colorScheme={notification.status === 'pending' ? 'blue' : 'green'}
                        variant={notification.status === 'pending' ? 'solid' : 'subtle'}
                      >
                        {notification.status}
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color={subTextColor}>
                      {new Date(notification.timestamp).toLocaleString()}
                    </Text>
                    <Text>
                      {notification.type === 'storage_upgrade' 
                        ? `User requested storage upgrade. Current usage: ${notification.current_usage}MB, Plan limit: ${notification.plan_limit}MB`
                        : `User requested document upload approval`}
                    </Text>
                  </VStack>
                </Box>
              ))}
            </VStack>
          )}
        </Box>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedNotification?.type === 'storage_upgrade' ? 'Storage Upgrade Request' : 'Upload Request'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedNotification && (
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Text fontWeight="bold">Status:</Text>
                  <Badge
                    colorScheme={selectedNotification.status === 'pending' ? 'blue' : 'green'}
                    variant={selectedNotification.status === 'pending' ? 'solid' : 'subtle'}
                  >
                    {selectedNotification.status}
                  </Badge>
                </HStack>
                <Text>
                  <Text as="span" fontWeight="bold">Time:</Text>{' '}
                  {new Date(selectedNotification.timestamp).toLocaleString()}
                </Text>
                {selectedNotification.type === 'storage_upgrade' ? (
                  <>
                    <Text>
                      <Text as="span" fontWeight="bold">Current Usage:</Text>{' '}
                      {selectedNotification.current_usage}MB
                    </Text>
                    <Text>
                      <Text as="span" fontWeight="bold">Plan Limit:</Text>{' '}
                      {selectedNotification.plan_limit}MB
                    </Text>
                    {selectedNotification.reason && (
                      <Text>
                        <Text as="span" fontWeight="bold">Reason:</Text>{' '}
                        {selectedNotification.reason}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text>
                    <Text as="span" fontWeight="bold">Request Type:</Text>{' '}
                    Document Upload Approval
                  </Text>
                )}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default NotificationsPage;