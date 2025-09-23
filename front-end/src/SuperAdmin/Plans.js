import React, { useState, useEffect } from 'react';
import { backend } from '../config';
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
  Icon,
  Center,
  Spinner,
  Alert,
  AlertIcon,
  SimpleGrid,
} from '@chakra-ui/react';
import { 
  FaCheck, 
  FaDatabase, 
  FaCloud, 
  FaServer, 
  FaShieldAlt, 
  FaLock,
  FaRocket,
  FaUsers,
  FaHeadset,
  FaCode,
  FaInfinity,
  FaFileAlt,
  FaUpload,
  FaDownload,
  FaSync,
  FaClock,
  FaEye,
  FaPalette,
  FaUserTie
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import axios from 'axios';

const MotionBox = motion(Box);
const MotionModalContent = motion(ModalContent);
const MotionButton = motion(Button);

const SuperAdminPlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedPlan, setSelectedPlan] = useState({
    id: null,
    name: '',
    price: 0,
    storageLimit: 0,
    features: []
  });
  const [isActivating, setIsActivating] = useState(false);
  const [activePlanId, setActivePlanId] = useState(null);
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const popularBgColor = useColorModeValue('blue.50', 'blue.900');
  const popularBorderColor = useColorModeValue('blue.200', 'blue.700');
  const headingColor = useColorModeValue('gray.800', 'white');
  const subHeadingColor = useColorModeValue('gray.600', 'gray.300');

  const cardWidth = useBreakpointValue({ base: 'full', md: '320px', lg: '360px' });

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

  const buttonVariants = {
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.2
      }
    },
    tap: {
      scale: 0.95
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchCurrentPlan();
  }, []);

  const fetchPlans = async () => {
    try {
      console.log("=== Frontend Debug Logs ===");
      console.log("Fetching plans from backend...");
      
      const response = await fetch(`${backend}/post_docs/superadmin/plans`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch plans');
      }
      
      const data = await response.json();
      console.log("Raw response from backend:", JSON.stringify(data, null, 2));
      
      setPlans(data.plans);
      console.log("Plans set in state:", JSON.stringify(data.plans, null, 2));
      
      // Find and set the active plan
      const activePlan = data.plans.find(plan => plan.is_active);
      if (activePlan) {
        setActivePlanId(activePlan.id);
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Error fetching plans:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchCurrentPlan = async () => {
    try {
      const response = await fetch(`${backend}/post_docs/superadmin/institution/plan`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch current plan');
      }
      
      const data = await response.json();
      if (data.success && data.plan) {
        setActivePlanId(data.plan.id);
      }
    } catch (err) {
      console.error("Error fetching current plan:", err);
      toast({
        title: "Error",
        description: "Failed to fetch current plan",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleActivatePlan = async (planId) => {
    setIsActivating(true);
    try {
      const response = await fetch(`${backend}/post_docs/superadmin/institution/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ planId })
      });

      if (!response.ok) {
        throw new Error('Failed to activate plan');
      }

      setActivePlanId(planId);
      await fetchPlans(); // Refresh plans to get updated active status
      onClose(); // Close the modal after successful activation
      
      // Show success toast
      toast({
        title: "Plan Activated",
        description: "The plan has been successfully activated for your institution",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      setError(err.message);
      // Show error toast
      toast({
        title: "Error",
        description: err.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsActivating(false);
    }
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    onOpen();
  };

  const formatStorage = (sizeInMB) => {
    if (!sizeInMB || sizeInMB === 0) return '0 MB';
    
    const mb = parseFloat(sizeInMB);
    
    // Convert to TB if >= 1024 GB (1048576 MB)
    if (mb >= 1048576) {
      const tb = mb / 1048576;
      return `${tb % 1 === 0 ? tb.toFixed(0) : tb.toFixed(1)}TB`;
    }
    
    // Convert to GB if >= 1024 MB
    if (mb >= 1024) {
      const gb = mb / 1024;
      return `${gb % 1 === 0 ? gb.toFixed(0) : gb.toFixed(1)}GB`;
    }
    
    // Keep in MB if < 1024 MB
    return `${mb % 1 === 0 ? mb.toFixed(0) : mb.toFixed(1)}MB`;
  };

  const getFeatureIcon = (feature) => {
    const iconMap = {
      'Basic document management': FaFileAlt,
      'Advanced document management': FaDatabase,
      'Enterprise document management': FaServer,
      'Standard support': FaHeadset,
      'Priority support': FaHeadset,
      '24/7 premium support': FaHeadset,
      'Up to 5 users': FaUsers,
      'Up to 20 users': FaUsers,
      'Unlimited users': FaUsers,
      'Basic security features': FaShieldAlt,
      'Advanced security features': FaShieldAlt,
      'Document versioning': FaSync,
      'Custom integrations': FaCode,
      'API access': FaCode,
      'File upload & download': FaUpload,
      'Document preview': FaEye,
      'Custom branding': FaPalette,
      'Dedicated account manager': FaUserTie
    };
    return iconMap[feature] || FaCheck;
  };

  if (loading) {
    return (
      <Box p={8}>
        <Center>
        <Spinner size="xl" />
        </Center>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={8}>
      <Alert status="error">
        <AlertIcon />
        {error}
      </Alert>
      </Box>
    );
  }

  return (
    <>
      <Box position="relative" minH="100vh">
      {/* Background with subtle texture */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="transparent"
        _before={{
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23a855f7' fill-opacity='0.015'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          opacity: 0.3
        }}
        pointerEvents="none"
      />
      
      <Container maxW="container.xl" py={12} position="relative">
        <VStack spacing={16}>
          {/* Header Section */}
          <Box textAlign="center" maxW="700px" mx="auto">
            <MotionBox
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
            <Heading 
              as="h1" 
              size="2xl" 
                mb={6}
                bgGradient="linear(to-r, purple.600, violet.600, purple.600)"
              bgClip="text"
                fontWeight="800"
                letterSpacing="-0.02em"
            >
              Choose Your Storage Plan
            </Heading>
              <Text 
                fontSize="lg" 
                color="gray.600"
                fontWeight="400"
                lineHeight="1.6"
              >
              Select the perfect plan for your storage needs and unlock powerful features
            </Text>
            </MotionBox>
        </Box>

          {/* Plans Grid */}
          <SimpleGrid 
            columns={{ base: 1, md: 3 }} 
            spacing={8} 
          w="full"
            maxW="1200px"
            mx="auto"
        >
          {plans.map((plan, index) => (
            <MotionBox
              key={plan.id}
                initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8 }}
                h="full"
            >
              <Box
                  bg="white"
                  borderRadius="2xl"
                  boxShadow="0 10px 40px -10px rgba(138, 43, 226, 0.2)"
                  borderWidth="1px"
                  borderColor={activePlanId === plan.id ? 'purple.300' : 'gray.100'}
                p={8}
                  h="full"
                position="relative"
                overflow="hidden"
                  transform="translateZ(0)"
                  _hover={{
                    boxShadow: "0 20px 50px -10px rgba(138, 43, 226, 0.3)",
                    borderColor: "purple.200"
                  }}
                  transition="all 0.3s ease"
                >
                  {/* Active Plan Badge */}
                {activePlanId === plan.id && (
                  <Badge
                    position="absolute"
                      top={4}
                    right={4}
                    colorScheme="purple"
                      fontSize="xs"
                    px={3}
                    py={1}
                    borderRadius="full"
                      fontWeight="600"
                      textTransform="uppercase"
                      letterSpacing="0.5px"
                  >
                      Active Plan
                  </Badge>
                )}

                  {/* Popular Badge */}
                  {index === 1 && !activePlanId && (
                  <Badge
                    position="absolute"
                      top={4}
                    right={4}
                    colorScheme="blue"
                      fontSize="xs"
                    px={3}
                    py={1}
                    borderRadius="full"
                      fontWeight="600"
                      textTransform="uppercase"
                      letterSpacing="0.5px"
                  >
                      Most Popular
                  </Badge>
                )}

                  <VStack spacing={6} align="stretch" h="full">
                    {/* Plan Header */}
                  <Box textAlign="center">
                      <Heading 
                        size="lg" 
                        mb={3} 
                        color={activePlanId === plan.id ? 'purple.600' : 'gray.800'}
                        fontWeight="700"
                      >
                      {plan.name}
                    </Heading>
                      <HStack justify="center" spacing={0} mb={2}>
                        <Text 
                          fontSize="4xl" 
                          fontWeight="800" 
                          color={activePlanId === plan.id ? 'purple.500' : 'gray.900'}
                          lineHeight="1"
                        >
                        ${plan.price}
                      </Text>
                        <Text 
                          fontSize="lg" 
                          color="gray.500" 
                          alignSelf="flex-end" 
                          mb={1}
                          fontWeight="500"
                        >
                        /month
                      </Text>
                    </HStack>
                  </Box>

                    {/* Features List */}
                    <VStack spacing={4} align="stretch" flex={1}>
                      <Box
                        p={4}
                        bg={activePlanId === plan.id ? 'purple.50' : 'gray.50'}
                        borderRadius="xl"
                        border="1px solid"
                        borderColor={activePlanId === plan.id ? 'purple.100' : 'gray.200'}
                      >
                        <HStack spacing={3}>
                          <Icon 
                            as={FaDatabase} 
                            color={activePlanId === plan.id ? 'purple.500' : 'blue.500'} 
                            boxSize={5}
                          />
                          <Text fontWeight="600" fontSize="md">
                            {formatStorage(plan.storageLimit)} Storage
                        </Text>
                      </HStack>
                      </Box>

                      <List spacing={3}>
                        {plan.features?.map((feature, featureIndex) => (
                          <ListItem key={featureIndex}>
                            <HStack spacing={3} align="start">
                              <Icon 
                                as={getFeatureIcon(feature)} 
                                color={activePlanId === plan.id ? 'purple.500' : 'green.500'} 
                                boxSize={4}
                                mt={0.5}
                              />
                              <Text fontSize="sm" color="gray.700" lineHeight="1.5">
                                {feature}
                              </Text>
                        </HStack>
                      </ListItem>
                    ))}
                  </List>
                    </VStack>

                    {/* Action Button */}
                  <Button
                      colorScheme={activePlanId === plan.id ? 'purple' : (index === 1 ? 'blue' : 'gray')}
                    size="lg"
                    w="full"
                    onClick={() => handlePlanSelect(plan)}
                    isDisabled={activePlanId === plan.id}
                    isLoading={isActivating}
                    loadingText="Activating..."
                      fontWeight="600"
                      borderRadius="xl"
                      h="12"
                      _hover={{
                        transform: activePlanId !== plan.id ? 'translateY(-2px)' : 'none',
                        boxShadow: activePlanId !== plan.id ? 'lg' : 'none',
                      }}
                      transition="all 0.2s ease"
                      _disabled={{
                        opacity: 0.8,
                        cursor: 'not-allowed',
                        _hover: {
                          transform: 'none'
                        }
                      }}
                  >
                    {activePlanId === plan.id ? 'Current Plan' : 'Select Plan'}
                </Button>
                </VStack>
              </Box>
            </MotionBox>
          ))}
          </SimpleGrid>
      </VStack>
       </Container>
     </Box>

      <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl">
        <ModalOverlay 
          bg="blackAlpha.600"
          backdropFilter="blur(10px)"
        />
        <MotionModalContent
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          bg="white"
          borderRadius="2xl"
          overflow="hidden"
        >
          <Box
            bgGradient="linear(to-r, blue.500, purple.500)"
            p={6}
            color="white"
          >
            <ModalHeader fontSize="2xl" fontWeight="bold">
              Confirm Plan Selection
            </ModalHeader>
            <ModalCloseButton color="white" />
          </Box>
          
          <ModalBody p={6}>
            <VStack spacing={6} align="stretch">
              <Box textAlign="center">
                <Heading size="lg" color="gray.700" mb={2}>
                  {selectedPlan?.name}
                </Heading>
                <Text fontSize="xl" color="gray.600">
                  ${selectedPlan?.price}/month
                </Text>
              </Box>

              <Box bg="gray.50" p={6} borderRadius="xl">
                <VStack spacing={4} align="stretch">
                  <HStack spacing={4}>
                    <Icon as={FaDatabase} color="blue.500" boxSize={6} />
                    <Box>
                      <Text fontWeight="bold" color="gray.700">Storage</Text>
                      <Text color="gray.600">{formatStorage(selectedPlan?.storageLimit)} Total Storage</Text>
                    </Box>
                  </HStack>

                  <HStack spacing={4}>
                    <Icon as={FaUsers} color="blue.500" boxSize={6} />
                    <Box>
                      <Text fontWeight="bold" color="gray.700">Users</Text>
                      <Text color="gray.600">{selectedPlan?.features?.find(f => f.includes('users')) || 'No user limit specified'}</Text>
                    </Box>
                  </HStack>

                  <HStack spacing={4}>
                    <Icon as={FaHeadset} color="blue.500" boxSize={6} />
                    <Box>
                      <Text fontWeight="bold" color="gray.700">Support</Text>
                      <Text color="gray.600">{selectedPlan?.features?.find(f => f.includes('support')) || 'No support details specified'}</Text>
                    </Box>
                  </HStack>

                  <HStack spacing={4}>
                    <Icon as={FaShieldAlt} color="blue.500" boxSize={6} />
                    <Box>
                      <Text fontWeight="bold" color="gray.700">Security</Text>
                      <Text color="gray.600">{selectedPlan?.features?.find(f => f.includes('security')) || 'Basic security features'}</Text>
                    </Box>
                  </HStack>

                  <HStack spacing={4}>
                    <Icon as={FaFileAlt} color="blue.500" boxSize={6} />
                    <Box>
                      <Text fontWeight="bold" color="gray.700">File Limits</Text>
                      <Text color="gray.600">
                        Max {selectedPlan?.features?.maxFiles || 0} files, 
                        {selectedPlan?.features?.maxFileSize || 0}MB per file
                      </Text>
                    </Box>
                  </HStack>
                </VStack>
              </Box>

              <Box bg="purple.50" p={4} borderRadius="lg">
                <Text color="purple.700" fontWeight="medium">
                  By selecting this plan, you'll get access to all the features listed above.
                  Your current plan will be deactivated and replaced with this one.
                </Text>
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter p={6} bg="gray.50">
            <HStack spacing={4}>
              <MotionButton
                variant="ghost"
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Cancel
              </MotionButton>
              <MotionButton
                colorScheme="blue"
                onClick={() => selectedPlan?.id && handleActivatePlan(selectedPlan.id)}
                isLoading={isActivating}
                loadingText="Activating..."
                isDisabled={!selectedPlan?.id || activePlanId === selectedPlan.id}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                Confirm Selection
              </MotionButton>
            </HStack>
          </ModalFooter>
        </MotionModalContent>
      </Modal>
    </>
  );
};

export default SuperAdminPlans; 