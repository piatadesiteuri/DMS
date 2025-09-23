import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  useColorModeValue,
  ScaleFade,
  useToast,
  Icon,
  List,
  ListItem,
  ListIcon,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Textarea,
  Select,
  IconButton,
} from '@chakra-ui/react';
import { FaCheck, FaCrown, FaStar, FaBuilding, FaDatabase, FaUsers, FaShieldAlt, FaHeadset, FaCode, FaEdit, FaTimes, FaPlus, FaSave } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { backend } from '../config';
const MotionBox = motion(Box);

const PlanCard = ({ plan, index, onUpdatePlan }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const [newFeature, setNewFeature] = useState('');
  
  // Add color mode values at the component level
  const modalBg = useColorModeValue('white', 'gray.800');
  const modalBorderColor = useColorModeValue('gray.200', 'gray.700');
  const inputBorderColor = useColorModeValue('gray.200', 'gray.600');
  const inputHoverBorderColor = useColorModeValue('gray.300', 'gray.500');
  const labelColor = useColorModeValue('gray.600', 'gray.400');
  const featureBg = useColorModeValue('gray.50', 'gray.700');
  const featureBorderColor = useColorModeValue('gray.200', 'gray.600');
  const cancelHoverBg = useColorModeValue('gray.100', 'gray.700');
  const deleteHoverBg = useColorModeValue('red.50', 'red.900');
  
  // Safely parse features
  const parseFeatures = (featuresArray) => {
    if (!featuresArray) return [];
    return Array.isArray(featuresArray) ? featuresArray : [];
  };

  const features = parseFeatures(plan.features);
  
  const [editedPlan, setEditedPlan] = useState({
    name: plan.name || '',
    storage_limit: plan.storage_limit || 0,
    price: plan.price || 0,
    features: features,
    maxFiles: plan.maxFiles || 0,
    maxFileSize: plan.maxFileSize || 0,
    storageUnit: 'MB',
    displayStorage: plan.storage_limit || 0
  });

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setEditedPlan({
        ...editedPlan,
        features: [...editedPlan.features, newFeature.trim()]
      });
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index) => {
    const newFeatures = [...editedPlan.features];
    newFeatures.splice(index, 1);
    setEditedPlan({
      ...editedPlan,
      features: newFeatures
    });
  };

  const handleStorageChange = (value) => {
    let numericValue = parseFloat(value);
    if (isNaN(numericValue)) numericValue = 0;
    
    // Store the display value
    setEditedPlan(prev => ({
      ...prev,
      displayStorage: numericValue
    }));

    // Convert to MB based on selected unit
    let storageInMB = numericValue;
    switch (editedPlan.storageUnit) {
      case 'GB':
        storageInMB = numericValue * 1024;
        break;
      case 'TB':
        storageInMB = numericValue * 1024 * 1024;
        break;
    }
    
    // Update the actual storage limit in MB
    setEditedPlan(prev => ({
      ...prev,
      storage_limit: storageInMB
    }));
  };

  const handleUnitChange = (unit) => {
    // Convert the current storage_limit to the new unit for display
    let displayValue = editedPlan.storage_limit;
    switch (unit) {
      case 'GB':
        displayValue = editedPlan.storage_limit / 1024;
        break;
      case 'TB':
        displayValue = editedPlan.storage_limit / (1024 * 1024);
        break;
    }
    
    setEditedPlan(prev => ({
      ...prev,
      storageUnit: unit,
      displayStorage: displayValue
    }));
  };

  const formatStorageDisplay = (value) => {
    if (value >= 1024 * 1024) {
      return `${(value / (1024 * 1024)).toFixed(2)} TB`;
    } else if (value >= 1024) {
      return `${(value / 1024).toFixed(2)} GB`;
    }
    return `${value} MB`;
  };

  const getPlanIcon = () => {
    switch ((plan.name || '').toLowerCase()) {
      case 'basic plan':
        return FaStar;
      case 'pro plan':
        return FaCrown;
      case 'enterprise plan':
        return FaBuilding;
      default:
        return FaStar;
    }
  };

  const getPlanColor = () => {
    switch ((plan.name || '').toLowerCase()) {
      case 'basic plan':
        return 'blue';
      case 'pro plan':
        return 'purple';
      case 'enterprise plan':
        return 'green';
      default:
        return 'blue';
    }
  };

  const handleUpdatePlan = async () => {
    try {
      const planData = {
        name: editedPlan.name,
        storage_limit: editedPlan.storage_limit,
        price: editedPlan.price,
        maxFiles: editedPlan.maxFiles,
        maxFileSize: editedPlan.maxFileSize,
        features: editedPlan.features
      };

      await onUpdatePlan(plan.id, planData);

      toast({
        title: 'Success',
        description: 'Plan updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update plan',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <>
      <MotionBox
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          bg={cardBg}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="xl"
          overflow="hidden"
          boxShadow={isHovered ? 'xl' : 'md'}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          position="relative"
        >
          <CardHeader>
            <VStack spacing={4} align="stretch">
              <HStack justify="center">
                <Icon as={getPlanIcon()} boxSize={8} color={`${getPlanColor()}.500`} />
                <Heading size="lg" color={`${getPlanColor()}.500`}>
                  {editedPlan.name || 'Unnamed Plan'}
                </Heading>
              </HStack>
              <HStack justify="center">
                <Text fontSize="4xl" fontWeight="bold">
                  ${editedPlan.price || 0}
                </Text>
                <Text color="gray.500">/month</Text>
              </HStack>
            </VStack>
          </CardHeader>

          <Divider />

          <CardBody>
            <VStack spacing={6} align="stretch">
              <HStack spacing={2} justify="center">
                <Icon as={FaDatabase} color="blue.500" />
                <Text fontSize="lg">
                  {formatStorageDisplay(editedPlan.storage_limit || 0)} Storage
                </Text>
              </HStack>

              <List spacing={3}>
                {editedPlan.features.map((feature, idx) => (
                  <ListItem key={idx}>
                    <HStack>
                      <ListIcon as={FaCheck} color="green.500" />
                      <Text>{feature}</Text>
                    </HStack>
                  </ListItem>
                ))}
              </List>

              <Box bg={useColorModeValue('gray.50', 'gray.700')} p={4} borderRadius="md">
                <VStack spacing={3} align="stretch">
                  <HStack spacing={2}>
                    <Icon as={FaUsers} color="purple.500" />
                    <Text fontWeight="medium">Maximum Files:</Text>
                    <Text fontWeight="bold">{editedPlan.maxFiles === 100 ? 'Unlimited' : editedPlan.maxFiles}</Text>
                  </HStack>
                  <HStack spacing={2}>
                    <Icon as={FaShieldAlt} color="orange.500" />
                    <Text fontWeight="medium">Maximum File Size:</Text>
                    <Text fontWeight="bold">{editedPlan.maxFileSize}MB</Text>
                  </HStack>
                </VStack>
              </Box>

              <Button
                leftIcon={<FaEdit />}
                colorScheme={getPlanColor()}
                size="lg"
                width="full"
                mt={4}
                onClick={onOpen}
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg',
                }}
                transition="all 0.2s"
              >
                Edit Plan
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </MotionBox>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay backdropFilter="blur(10px)" />
        <ModalContent 
          bg={modalBg}
          borderRadius="xl"
          boxShadow="2xl"
        >
          <ModalHeader 
            borderBottomWidth="1px"
            borderColor={modalBorderColor}
            py={4}
          >
            <HStack spacing={3}>
              <Icon as={getPlanIcon()} boxSize={6} color={`${getPlanColor()}.500`} />
              <Heading size="md">Edit Plan</Heading>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <VStack spacing={8}>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color={labelColor}>
                  Plan Name
                </FormLabel>
                <Input
                  value={editedPlan.name}
                  onChange={(e) => setEditedPlan({ ...editedPlan, name: e.target.value })}
                  placeholder="Enter plan name"
                  size="lg"
                  borderRadius="md"
                  borderColor={inputBorderColor}
                  _hover={{ borderColor: inputHoverBorderColor }}
                  _focus={{ borderColor: `${getPlanColor()}.500`, boxShadow: `0 0 0 1px ${getPlanColor()}.500` }}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color={labelColor}>
                  Storage Limit
                </FormLabel>
                <HStack spacing={3}>
                  <NumberInput
                    min={0}
                    value={editedPlan.displayStorage}
                    onChange={handleStorageChange}
                    precision={2}
                    size="lg"
                    flex={1}
                  >
                    <NumberInputField
                      borderRadius="md"
                      borderColor={inputBorderColor}
                      _hover={{ borderColor: inputHoverBorderColor }}
                      _focus={{ borderColor: `${getPlanColor()}.500`, boxShadow: `0 0 0 1px ${getPlanColor()}.500` }}
                    />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <Select
                    value={editedPlan.storageUnit}
                    onChange={(e) => handleUnitChange(e.target.value)}
                    width="120px"
                    size="lg"
                    borderRadius="md"
                    borderColor={inputBorderColor}
                    _hover={{ borderColor: inputHoverBorderColor }}
                    _focus={{ borderColor: `${getPlanColor()}.500`, boxShadow: `0 0 0 1px ${getPlanColor()}.500` }}
                  >
                    <option value="MB">MB</option>
                    <option value="GB">GB</option>
                    <option value="TB">TB</option>
                  </Select>
                </HStack>
                <Text fontSize="sm" color={labelColor} mt={2}>
                  Current value in database: {formatStorageDisplay(editedPlan.storage_limit)}
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color={labelColor}>
                  Price ($)
                </FormLabel>
                <NumberInput
                  min={0}
                  value={editedPlan.price}
                  onChange={(value) => setEditedPlan({ ...editedPlan, price: value })}
                  precision={2}
                  step={0.01}
                  size="lg"
                >
                  <NumberInputField
                    borderRadius="md"
                    borderColor={inputBorderColor}
                    _hover={{ borderColor: inputHoverBorderColor }}
                    _focus={{ borderColor: `${getPlanColor()}.500`, boxShadow: `0 0 0 1px ${getPlanColor()}.500` }}
                  />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color={labelColor}>
                  Features
                </FormLabel>
                <VStack align="stretch" spacing={3}>
                  {editedPlan.features.map((feature, index) => (
                    <HStack
                      key={index}
                      p={3}
                      borderRadius="md"
                      bg={featureBg}
                      borderWidth="1px"
                      borderColor={featureBorderColor}
                    >
                      <Icon as={FaCheck} color="green.500" />
                      <Text flex={1}>{feature}</Text>
                      <IconButton
                        icon={<FaTimes />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => handleRemoveFeature(index)}
                        _hover={{ bg: deleteHoverBg }}
                      />
                    </HStack>
                  ))}
                  <HStack>
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Add new feature"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddFeature()}
                      size="lg"
                      borderRadius="md"
                      borderColor={inputBorderColor}
                      _hover={{ borderColor: inputHoverBorderColor }}
                      _focus={{ borderColor: `${getPlanColor()}.500`, boxShadow: `0 0 0 1px ${getPlanColor()}.500` }}
                    />
                    <IconButton
                      icon={<FaPlus />}
                      colorScheme="blue"
                      onClick={handleAddFeature}
                      isDisabled={!newFeature.trim()}
                      size="lg"
                      borderRadius="md"
                    />
                  </HStack>
                </VStack>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color={labelColor}>
                  Max Files
                </FormLabel>
                <NumberInput
                  min={0}
                  value={editedPlan.maxFiles}
                  onChange={(value) => setEditedPlan({ ...editedPlan, maxFiles: value })}
                  size="lg"
                >
                  <NumberInputField
                    borderRadius="md"
                    borderColor={inputBorderColor}
                    _hover={{ borderColor: inputHoverBorderColor }}
                    _focus={{ borderColor: `${getPlanColor()}.500`, boxShadow: `0 0 0 1px ${getPlanColor()}.500` }}
                  />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color={labelColor}>
                  Max File Size (MB)
                </FormLabel>
                <NumberInput
                  min={0}
                  value={editedPlan.maxFileSize}
                  onChange={(value) => setEditedPlan({ ...editedPlan, maxFileSize: value })}
                  size="lg"
                >
                  <NumberInputField
                    borderRadius="md"
                    borderColor={inputBorderColor}
                    _hover={{ borderColor: inputHoverBorderColor }}
                    _focus={{ borderColor: `${getPlanColor()}.500`, boxShadow: `0 0 0 1px ${getPlanColor()}.500` }}
                  />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter
            borderTopWidth="1px"
            borderColor={modalBorderColor}
            py={4}
          >
            <Button
              variant="ghost"
              mr={3}
              onClick={onClose}
              _hover={{ bg: cancelHoverBg }}
            >
              Cancel
            </Button>
            <Button
              colorScheme={getPlanColor()}
              onClick={handleUpdatePlan}
              leftIcon={<FaSave />}
              size="lg"
              borderRadius="md"
              _hover={{
                transform: 'translateY(-1px)',
                boxShadow: 'lg',
              }}
              transition="all 0.2s"
            >
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
          const response = await fetch(`${backend}/post_docs/superadmin/plans`, {
          credentials: 'include',
          headers: {
            'Origin': window.location.origin
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch plans');
        }
        
        const data = await response.json();
        
        if (isMounted) {
          console.log('Raw plans data:', JSON.stringify(data, null, 2));
          
          if (data.success) {
            // Transform the data to match our expected structure
            const processedPlans = data.plans.map(plan => ({
              id: plan.id,
              name: plan.name,
              storage_limit: plan.storageLimit,
              price: parseFloat(plan.price),
              features: plan.features || [],
              maxFiles: plan.maxFiles || 0,
              maxFileSize: plan.maxFileSize || 0
            }));
            
            console.log('Processed plans:', JSON.stringify(processedPlans, null, 2));
            setPlans(processedPlans);
          }
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
        if (isMounted) {
          toast({
            title: 'Error',
            description: 'Failed to fetch plans',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const handleUpdatePlan = async (planId, updatedPlan) => {
    try {
      const response = await fetch(`${backend}/post_docs/director/plans/${planId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          name: updatedPlan.name,
          storage_limit: updatedPlan.storage_limit,
          price: updatedPlan.price,
          maxFiles: updatedPlan.maxFiles,
          maxFileSize: updatedPlan.maxFileSize,
          features: updatedPlan.features || []
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update plan');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh plans after successful update
        const plansResponse = await fetch(`${backend}/post_docs/superadmin/plans`, {
          credentials: 'include',
          headers: {
            'Origin': window.location.origin
          }
        });
        
        if (!plansResponse.ok) {
          throw new Error('Failed to fetch updated plans');
        }
        
        const plansData = await plansResponse.json();
        if (plansData.success) {
          const processedPlans = plansData.plans.map(plan => ({
            id: plan.id,
            name: plan.name,
            storage_limit: plan.storageLimit,
            price: parseFloat(plan.price),
            features: plan.features || [],
            maxFiles: plan.maxFiles || 0,
            maxFileSize: plan.maxFileSize || 0
          }));
          setPlans(processedPlans);
          toast({
            title: 'Success',
            description: 'Plan updated successfully',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        }
      } else {
        throw new Error(data.error || 'Failed to update plan');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={10}>
        <Text>Loading plans...</Text>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading size="2xl" mb={4}>
            Manage Plans
          </Heading>
          <Text fontSize="xl" color="gray.600">
            Edit and update plans
          </Text>
        </Box>

        <Grid
          templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
          gap={8}
          mt={8}
        >
          {plans.map((plan, index) => (
            <ScaleFade key={plan.id} in={true} delay={index * 0.2}>
              <PlanCard 
                plan={plan} 
                index={index} 
                onUpdatePlan={handleUpdatePlan}
              />
            </ScaleFade>
          ))}
        </Grid>
      </VStack>
    </Container>
  );
};

export default Plans; 