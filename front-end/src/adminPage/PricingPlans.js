import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Icon,
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
  FaFileAlt
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import StorageUsage from './StorageUsage';
import { backend } from '../config';
const MotionBox = motion(Box);

const PricingPlans = () => {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const popularBgColor = useColorModeValue('blue.50', 'blue.900');
  const popularBorderColor = useColorModeValue('blue.200', 'blue.700');
  const headingColor = useColorModeValue('gray.800', 'white');
  const subHeadingColor = useColorModeValue('gray.600', 'gray.300');

  const cardWidth = useBreakpointValue({ base: 'full', md: '320px', lg: '360px' });

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${backend}/api/admin/plans`, {
          method: 'GET',
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch plans');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setPlans(data.plans);
          setCurrentPlan(data.currentPlan);
        } else {
          throw new Error(data.error || 'Failed to fetch plans');
        }
      } catch (err) {
        console.error('Error fetching plans:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    onOpen();
  };

  const handlePlanActivation = async () => {
    try {
      const response = await fetch(`${backend}/api/admin/plans/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ planId: selectedPlan.id })
      });

      if (!response.ok) {
        throw new Error('Failed to update plan');
      }

      const data = await response.json();
      if (data.success) {
        setCurrentPlan(selectedPlan.id);
        setRefreshKey(prev => prev + 1);
        toast({
          title: 'Plan Updated',
          description: `Successfully switched to ${selectedPlan.name}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(data.error || 'Failed to update plan');
      }
    } catch (err) {
      console.error('Error updating plan:', err);
      toast({
        title: 'Error',
        description: err.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      onClose();
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={10}>
        <Flex justify="center" align="center" minH="200px">
          <ScaleFade initialScale={0.9} in={true}>
            <Text>Loading plans...</Text>
          </ScaleFade>
        </Flex>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={10}>
        <Fade in={true}>
          <Text color="red.500">Error: {error}</Text>
        </Fade>
      </Container>
    );
  }

  const getFeatureIcon = (feature) => {
    const iconMap = {
      'Basic document management': FaFileAlt,
      'Advanced document management': FaDatabase,
      'Enterprise document management': FaServer,
      'Standard support': FaHeadset,
      'Priority support': FaHeadset,
      '24/7 premium support': FaHeadset,
      'Up to 10 users': FaUsers,
      'Up to 50 users': FaUsers,
      'Unlimited users': FaUsers,
      'Basic security features': FaShieldAlt,
      'Advanced security features': FaShieldAlt,
      'Document versioning': FaCode,
      'Custom integrations': FaCode,
      'API access': FaCode,
    };
    return iconMap[feature] || FaCheck;
  };

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={12}>
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
              Choose Your Storage Plan
            </Heading>
            <Text fontSize="xl" color={subHeadingColor}>
              Select the perfect plan for your storage needs and unlock powerful features
            </Text>
          </Fade>
        </Box>

        <Box w="full" mb={8}>
          <StorageUsage refreshKey={refreshKey} />
        </Box>

        <Stack
          direction={{ base: 'column', md: 'row' }}
          spacing={{ base: 8, md: 6 }}
          align="center"
          justify="center"
          w="full"
        >
          {plans.map((plan, index) => (
            <MotionBox
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              whileHover={{ scale: 1.02 }}
            >
              <Box
                bg={plan.isPopular ? popularBgColor : bgColor}
                borderRadius="xl"
                boxShadow="xl"
                borderWidth="1px"
                borderColor={plan.isPopular ? popularBorderColor : borderColor}
                p={8}
                w={cardWidth}
                position="relative"
                overflow="hidden"
                _before={{
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  bg: plan.isPopular ? 'blue.500' : 'transparent',
                }}
              >
                {plan.isPopular && (
                  <Badge
                    position="absolute"
                    top={-3}
                    right={4}
                    colorScheme="blue"
                    fontSize="sm"
                    px={3}
                    py={1}
                    borderRadius="full"
                    boxShadow="md"
                  >
                    MOST POPULAR
                  </Badge>
                )}

                <VStack spacing={6} align="stretch">
                  <Box textAlign="center">
                    <Heading size="lg" mb={2} color={headingColor}>
                      {plan.name}
                    </Heading>
                    <HStack justify="center" spacing={1}>
                      <Text fontSize="4xl" fontWeight="bold" color={plan.isPopular ? 'blue.500' : headingColor}>
                        ${plan.price}
                      </Text>
                      <Text fontSize="md" color={textColor} alignSelf="flex-end" mb={1}>
                        /month
                      </Text>
                    </HStack>
                  </Box>

                  <List spacing={4}>
                    <ListItem>
                      <HStack>
                        <ListIcon as={FaDatabase} color={plan.isPopular ? 'blue.500' : 'green.500'} />
                        <Text fontWeight="medium">
                          {plan.storageLimitMB} MB Storage
                        </Text>
                      </HStack>
                    </ListItem>
                    {plan.features.map((feature, index) => (
                      <ListItem key={index}>
                        <HStack>
                          <ListIcon as={getFeatureIcon(feature)} color={plan.isPopular ? 'blue.500' : 'green.500'} />
                          <Text>{feature}</Text>
                        </HStack>
                      </ListItem>
                    ))}
                  </List>

                  <Button
                    colorScheme={plan.isPopular ? 'blue' : 'gray'}
                    size="lg"
                    w="full"
                    onClick={() => handlePlanSelect(plan)}
                    isDisabled={currentPlan === plan.id}
                    _hover={{
                      transform: 'translateY(-2px)',
                      boxShadow: 'lg',
                    }}
                    transition="all 0.2s"
                  >
                    {currentPlan === plan.id ? 'Current Plan' : 'Select Plan'}
                  </Button>
                </VStack>
              </Box>
            </MotionBox>
          ))}
        </Stack>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Plan Selection</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to switch to the {selectedPlan?.name} plan? This will update your storage limit to{' '}
              {selectedPlan?.storageLimitMB} MB.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handlePlanActivation}>
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default PricingPlans; 