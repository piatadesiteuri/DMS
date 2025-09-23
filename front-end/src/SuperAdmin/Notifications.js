import React, { useState, useEffect } from 'react';
import { backend } from '../config';
import {
  Box,
  Text,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Badge,
  HStack,
  VStack,
  Flex,
  Select,
  Input,
  Center,
  AlertTitle,
  AlertDescription,
  Stack,
  Card,
  CardBody,
  ModalFooter,
  ButtonGroup,
  useColorModeValue,
  Avatar,
  Divider,
  Icon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../services/notificationService';
import { FaCheck, FaTimes, FaClock, FaUser, FaDatabase, FaCalendarAlt, FaBell } from 'react-icons/fa';

const MotionBox = motion(Box);
const MotionCard = motion(Card);

const ITEMS_PER_PAGE = 10;

const SuperAdminNotifications = () => {
  const { notifications: contextNotifications, markAsRead: markAsReadSocket, isConnected, unreadCount } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [lastNotificationCount, setLastNotificationCount] = useState(0);
  const toast = useToast();

  // Color scheme
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const hoverBg = useColorModeValue('purple.50', 'gray.700');
  const activeColor = useColorModeValue('purple.600', 'purple.300');

  // Use notifications from context instead of separate fetch
  const notifications = contextNotifications || [];

  // Show toast when new notifications arrive
  useEffect(() => {
    if (notifications.length > lastNotificationCount && lastNotificationCount > 0) {
      const newNotifications = notifications.length - lastNotificationCount;
      const pendingCount = notifications.filter(n => n.status === 'pending').length;
      
      toast({
        title: "Notificări noi",
        description: `${newNotifications} ${newNotifications === 1 ? 'notificare nouă' : 'notificări noi'}`,
        status: "info",
        duration: 4000,
        isClosable: true,
        position: "top-right",
        variant: "left-accent"
      });
    }
    setLastNotificationCount(notifications.length);
  }, [notifications.length, lastNotificationCount, toast]);

  // Initialize loading state
  useEffect(() => {
    if (notifications.length > 0) {
      setLoading(false);
    }
  }, [notifications]);

  const markNotificationAsRead = async (notificationId) => {
    try {
      const response = await fetch(`${backend}/api/admin/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      // Context will update automatically through polling/WebSocket
      await markAsReadSocket(notificationId);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleNotificationClick = async (notification) => {
    setSelectedNotification(notification);
    setIsModalOpen(true);
    
    if (notification.status === 'pending') {
      await markNotificationAsRead(notification.id_request);
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

      // Context will update automatically through polling/WebSocket
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error processing action:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <Badge 
            colorScheme="yellow" 
            px={3} 
            py={1} 
            borderRadius="full"
            fontSize="sm"
            fontWeight="medium"
            boxShadow="sm"
          >
            În așteptare
          </Badge>
        );
      case 'approved':
        return (
          <Badge 
            colorScheme="green" 
            px={3} 
            py={1} 
            borderRadius="full"
            fontSize="sm"
            fontWeight="medium"
            boxShadow="sm"
          >
            Procesată
          </Badge>
        );
      case 'rejected':
        return (
          <Badge 
            colorScheme="red" 
            px={3} 
            py={1} 
            borderRadius="full"
            fontSize="sm"
            fontWeight="medium"
            boxShadow="sm"
          >
            Respinsă
          </Badge>
        );
      default:
        return (
          <Badge 
            colorScheme="gray" 
            px={3} 
            py={1} 
            borderRadius="full"
            fontSize="sm"
            fontWeight="medium"
            boxShadow="sm"
          >
            Necunoscut
          </Badge>
        );
    }
  };

  const getTypeBadge = (type) => {
    if (!type) return null;
    
    switch (type.toLowerCase()) {
      case 'upload_request':
        return (
          <Badge
            colorScheme="blue"
            px={3}
            py={1}
            borderRadius="full"
            fontSize="sm"
            fontWeight="medium"
            boxShadow="sm"
          >
            📁 Upload Request
          </Badge>
        );
      case 'storage_upgrade':
        return (
          <Badge
            colorScheme="purple"
            px={3}
            py={1}
            borderRadius="full"
            fontSize="sm"
            fontWeight="medium"
            boxShadow="sm"
          >
            💾 Storage Upgrade
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Invalid date';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleString('ro-RO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.userName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || notification.type === filterType;
    const isPending = activeTab === 0 ? notification.status === 'pending' : notification.status === 'approved';
    return matchesSearch && matchesType && isPending;
  });

  const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

  if (loading) {
    return (
      <Center minH="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color="purple.500" thickness="4px" />
          <Text color="gray.500">Se încarcă notificările...</Text>
        </VStack>
      </Center>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="lg" mb={4}>
        <AlertIcon />
        <Box>
          <AlertTitle>Eroare!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Box>
      </Alert>
    );
  }

  return (
    <Box minH="100vh" bg="#f8fafc" p={6}>
      <Box maxW="6xl" mx="auto">
        {/* Header */}
        <Box
          bg="white"
          borderRadius="lg"
          p={6}
          mb={6}
          boxShadow="0 1px 3px rgba(0, 0, 0, 0.1)"
          borderWidth="1px"
          borderColor="gray.200"
        >
          <HStack justify="space-between" mb={4}>
            <VStack align="start" spacing={2}>
              <HStack spacing={3}>
                <Box
                  p={2}
                  borderRadius="lg"
                  bg="blue.500"
                  color="white"
                >
                  <FaBell size={20} />
                </Box>
                <VStack align="start" spacing={0}>
                  <Text 
                    fontSize="2xl" 
                    fontWeight="bold" 
                    color="gray.800"
                  >
                    Notificări
                  </Text>
                  <Text fontSize="md" color="gray.600">
                    Gestionează cererile utilizatorilor
                  </Text>
                </VStack>
              </HStack>
            </VStack>
            <HStack spacing={3}>
              <Badge 
                colorScheme={isConnected ? "green" : "red"} 
                fontSize="sm" 
                px={3} 
                py={1} 
                borderRadius="md"
                variant="subtle"
              >
                {isConnected ? "🟢 Online" : "🔴 Offline"}
              </Badge>
              <Badge 
                colorScheme="blue" 
                fontSize="sm" 
                px={3} 
                py={1} 
                borderRadius="md"
              >
                {unreadCount} necitite
              </Badge>
            </HStack>
          </HStack>
        </Box>

        {/* Inbox Container */}
        <Box
          bg="white"
          borderRadius="lg"
          boxShadow="0 1px 3px rgba(0, 0, 0, 0.1)"
          borderWidth="1px"
          borderColor="gray.200"
          overflow="hidden"
        >
          <Tabs variant="unstyled" onChange={setActiveTab} defaultIndex={0}>
            <Box px={6} pt={6} pb={4}>
              <TabList gap={3} justifyContent="start">
                <Tab 
                  px={4} 
                  py={2} 
                  borderRadius="md"
                  fontWeight="medium"
                  fontSize="sm"
                  _selected={{ 
                    color: 'white', 
                    bg: 'blue.500'
                  }}
                  _hover={{ 
                    bg: 'gray.100'
                  }}
                >
                  <HStack spacing={2}>
                    <Text>În așteptare</Text>
                    <Badge 
                      colorScheme="orange" 
                      borderRadius="full"
                      px={2}
                      py={0}
                      fontSize="xs"
                    >
                      {notifications.filter(n => n.status === 'pending').length}
                    </Badge>
                  </HStack>
                </Tab>
                <Tab 
                  px={4} 
                  py={2} 
                  borderRadius="md"
                  fontWeight="medium"
                  fontSize="sm"
                  _selected={{ 
                    color: 'white', 
                    bg: 'green.500'
                  }}
                  _hover={{ 
                    bg: 'gray.100'
                  }}
                >
                  <HStack spacing={2}>
                    <Text>Procesate</Text>
                    <Badge 
                      colorScheme="green" 
                      borderRadius="full"
                      px={2}
                      py={0}
                      fontSize="xs"
                    >
                      {notifications.filter(n => n.status === 'approved').length}
                    </Badge>
                  </HStack>
                </Tab>
              </TabList>
            </Box>

            <TabPanels>
              <TabPanel p={6}>
                {/* Filters */}
                <HStack spacing={4} mb={6}>
                  <Input
                    placeholder="Caută după nume..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    maxW="300px"
                    size="sm"
                    _focus={{ borderColor: 'blue.400' }}
                  />
                  <Select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value);
                      setCurrentPage(1);
                    }}
                    maxW="200px"
                    size="sm"
                    _focus={{ borderColor: 'blue.400' }}
                  >
                    <option value="all">Toate tipurile</option>
                    <option value="upload_request">Cereri de upload</option>
                    <option value="storage_upgrade">Îmbunătățiri de stocare</option>
                  </Select>
                </HStack>

                <AnimatePresence mode="wait">
                  {paginatedNotifications.length === 0 ? (
                    <Box
                      textAlign="center"
                      py={12}
                    >
                      <VStack spacing={3}>
                        <Box fontSize="3xl">📭</Box>
                        <Text fontSize="lg" fontWeight="medium" color="gray.600">
                          {activeTab === 0 ? "Nicio notificare în așteptare" : "Nicio notificare procesată"}
                        </Text>
                        <Text color="gray.500" fontSize="sm">
                          {activeTab === 0 ? "Toate notificările sunt la zi!" : "Nu sunt notificări procesate încă."}
                        </Text>
                      </VStack>
                    </Box>
                  ) : (
                    <Stack spacing={3}>
                      {paginatedNotifications.map((notification, index) => (
                        <Card
                          key={notification.id_request}
                          bg="white"
                          borderWidth="1px"
                          borderColor="gray.200"
                          borderRadius="md"
                          _hover={{ 
                            borderColor: 'blue.300',
                            boxShadow: 'sm'
                          }}
                          cursor="pointer"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <CardBody p={4}>
                            <HStack justify="space-between" align="start" spacing={4}>
                              <HStack spacing={3} flex={1}>
                                <Avatar 
                                  name={notification.userName}
                                  size="sm"
                                  bg="blue.500"
                                  color="white"
                                />
                                <VStack align="start" spacing={1} flex={1}>
                                  <HStack spacing={2} wrap="wrap">
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
                                    <Text fontWeight="medium" fontSize="sm" color="gray.800">
                                      {notification.userName}
                                    </Text>
                                  </HStack>
                                  
                                  <Text fontSize="sm" color="gray.600" noOfLines={1}>
                                    {notification.reason || 'Cerere de procesare'}
                                  </Text>
                                  
                                  <HStack spacing={3} fontSize="xs" color="gray.500">
                                    <Text>{formatDate(notification.timestamp)}</Text>
                                    <Text>{notification.current_usage}MB / {notification.plan_limit}MB</Text>
                                  </HStack>
                                </VStack>
                              </HStack>
                              
                              <VStack spacing={1} align="end">
                                {getStatusBadge(notification.status)}
                                {notification.status === 'pending' && (
                                  <Text fontSize="xs" color="orange.500">
                                    Needs action
                                  </Text>
                                )}
                              </VStack>
                            </HStack>
                          </CardBody>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </AnimatePresence>
              </TabPanel>
              
              {/* Second tab panel */}
              <TabPanel p={6}>
                <HStack spacing={4} mb={6}>
                  <Input
                    placeholder="Caută după nume..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    maxW="300px"
                    size="sm"
                    _focus={{ borderColor: 'blue.400' }}
                  />
                  <Select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value);
                      setCurrentPage(1);
                    }}
                    maxW="200px"
                    size="sm"
                    _focus={{ borderColor: 'blue.400' }}
                  >
                    <option value="all">Toate tipurile</option>
                    <option value="upload_request">Cereri de upload</option>
                    <option value="storage_upgrade">Îmbunătățiri de stocare</option>
                  </Select>
                </HStack>

                <AnimatePresence mode="wait">
                  {paginatedNotifications.length === 0 ? (
                    <Box
                      textAlign="center"
                      py={12}
                    >
                      <VStack spacing={3}>
                        <Box fontSize="3xl">✅</Box>
                        <Text fontSize="lg" fontWeight="medium" color="gray.600">
                          Nu sunt notificări procesate
                        </Text>
                        <Text color="gray.500" fontSize="sm">
                          Notificările procesate vor apărea aici.
                        </Text>
                      </VStack>
                    </Box>
                  ) : (
                    <Stack spacing={3}>
                      {paginatedNotifications.map((notification, index) => (
                        <Card
                          key={notification.id_request}
                          bg="white"
                          borderWidth="1px"
                          borderColor="gray.200"
                          borderRadius="md"
                          _hover={{ 
                            borderColor: 'green.300',
                            boxShadow: 'sm'
                          }}
                          cursor="pointer"
                          onClick={() => handleNotificationClick(notification)}
                          opacity={0.95}
                        >
                          <CardBody p={4}>
                            <HStack justify="space-between" align="start" spacing={4}>
                              <HStack spacing={3} flex={1}>
                                <Avatar 
                                  name={notification.userName}
                                  size="sm"
                                  bg="green.500"
                                  color="white"
                                />
                                <VStack align="start" spacing={1} flex={1}>
                                  <HStack spacing={2} wrap="wrap">
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
                                    <Text fontWeight="medium" fontSize="sm" color="gray.800">
                                      {notification.userName}
                                    </Text>
                                  </HStack>
                                  
                                  <Text fontSize="sm" color="gray.600" noOfLines={1}>
                                    {notification.reason || 'Cerere procesată'}
                                  </Text>
                                  
                                  <HStack spacing={3} fontSize="xs" color="gray.500">
                                    <Text>{formatDate(notification.timestamp)}</Text>
                                    <Text>{notification.current_usage}MB / {notification.plan_limit}MB</Text>
                                  </HStack>
                                </VStack>
                              </HStack>
                              
                              <VStack spacing={1} align="end">
                                {getStatusBadge(notification.status)}
                              </VStack>
                            </HStack>
                          </CardBody>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </AnimatePresence>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box mt={6}>
            <Flex justify="center">
              <HStack spacing={2}>
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  isDisabled={currentPage === 1}
                  colorScheme="blue"
                  variant="outline"
                  size="sm"
                >
                  ← Anterior
                </Button>
                <Text mx={4} fontSize="sm" color="gray.600">
                  Pagina {currentPage} din {totalPages}
                </Text>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  isDisabled={currentPage === totalPages}
                  colorScheme="blue"
                  variant="outline"
                  size="sm"
                >
                  Următor →
                </Button>
              </HStack>
            </Flex>
          </Box>
        )}

        {/* Notification Detail Modal */}
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          size="lg"
        >
          <ModalOverlay bg="blackAlpha.300" />
          <ModalContent borderRadius="lg">
            <ModalHeader 
              bg="blue.500"
              color="white"
              fontSize="lg"
              fontWeight="semibold"
              py={4}
            >
              Detalii Notificare
            </ModalHeader>
            <ModalCloseButton color="white" />
            <ModalBody p={6}>
              {selectedNotification && (
                <Stack spacing={4}>
                  <Box
                    p={4}
                    borderRadius="md"
                    bg="gray.50"
                    borderWidth="1px"
                    borderColor="gray.200"
                  >
                    <VStack align="start" spacing={3}>
                      <HStack spacing={3}>
                        <Avatar 
                          name={selectedNotification.userName}
                          size="md"
                          bg="blue.500"
                        />
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="semibold" fontSize="lg">
                            {selectedNotification.userName}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {selectedNotification.userEmail}
                          </Text>
                          <Badge 
                            colorScheme={selectedNotification.type === 'storage_upgrade' ? 'purple' : 'blue'}
                            fontSize="xs"
                            px={2}
                            py={0.5}
                            borderRadius="md"
                            variant="subtle"
                          >
                            {selectedNotification.type === 'storage_upgrade' ? 'Stocare' : 'Upload'}
                          </Badge>
                        </VStack>
                      </HStack>
                      <Divider />
                      <HStack spacing={6} w="full">
                        <VStack align="start" spacing={1}>
                          <Text fontSize="xs" color="gray.500" fontWeight="medium">Utilizare curentă</Text>
                          <Text fontWeight="semibold" fontSize="md" color="blue.600">
                            {selectedNotification.current_usage} MB
                          </Text>
                        </VStack>
                        <VStack align="start" spacing={1}>
                          <Text fontSize="xs" color="gray.500" fontWeight="medium">Limită de plan</Text>
                          <Text fontWeight="semibold" fontSize="md" color="purple.600">
                            {selectedNotification.plan_limit} MB
                          </Text>
                        </VStack>
                      </HStack>
                    </VStack>
                  </Box>

                  <Box>
                    <Text fontWeight="semibold" mb={2} fontSize="md">Mesaj</Text>
                    <Box
                      p={3}
                      borderRadius="md"
                      bg="blue.50"
                      borderWidth="1px"
                      borderColor="blue.200"
                    >
                      <Text fontSize="sm" lineHeight="1.5">
                        {selectedNotification.reason || 'Nu sunt disponibile detalii suplimentare.'}
                      </Text>
                    </Box>
                  </Box>

                  <Box>
                    <Text fontWeight="semibold" mb={1} fontSize="md">Data cererii</Text>
                    <Text color="gray.600" fontSize="sm">
                      {formatDate(selectedNotification.timestamp)}
                    </Text>
                  </Box>
                </Stack>
              )}
            </ModalBody>
            
            {selectedNotification?.status === 'pending' && (
              <ModalFooter 
                p={4}
                borderTopWidth="1px"
                borderColor="gray.200"
                bg="gray.50"
              >
                <ButtonGroup spacing={3}>
                  <Button
                    colorScheme="green"
                    onClick={() => handleAction('approve')}
                    isLoading={actionLoading}
                    loadingText="Se aprobă..."
                    size="sm"
                  >
                    Aprobare
                  </Button>
                  <Button
                    colorScheme="red"
                    onClick={() => handleAction('reject')}
                    isLoading={actionLoading}
                    loadingText="Se respinge..."
                    size="sm"
                  >
                    Respinge
                  </Button>
                </ButtonGroup>
              </ModalFooter>
            )}
          </ModalContent>
        </Modal>
      </Box>
    </Box>
  );
};

export default SuperAdminNotifications; 