import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  useToast,
  VStack,
  FormErrorMessage,
  Box,
  Text,
  Divider,
  HStack,
  Icon,
  useColorModeValue,
  Badge,
  Tooltip,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { FaUserPlus, FaBuilding, FaUser, FaEnvelope, FaPhone, FaLock, FaShieldAlt, FaUserShield, FaUserTie, FaExclamationTriangle } from 'react-icons/fa';
import { backend } from '../../config';
const AddUserModal = ({ isOpen, onClose, institutionId, institutionName, onUserAdded }) => {
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    phone_number: '',
    password: '',
    confirmPassword: '',
    roles: 'user',
  });
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [directorId, setDirectorId] = useState(null);
  const toast = useToast();

  // Color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const iconColor = useColorModeValue('blue.500', 'blue.300');
  const selectBgColor = useColorModeValue('gray.50', 'gray.700');
  const warningColor = useColorModeValue('yellow.500', 'yellow.300');

  useEffect(() => {
    // Get director's ID from session
    const fetchDirectorId = async () => {
      try {
        const response = await fetch(`${backend}/check-session`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (data.id_user) {
          setDirectorId(data.id_user);
        }
      } catch (error) {
        console.error('Error fetching director ID:', error);
      }
    };

    fetchDirectorId();
  }, []);

  const validateField = (name, value) => {
    const newWarnings = { ...warnings };
    
    switch (name) {
      case 'email':
        if (value && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
          newWarnings.email = 'Please enter a valid email address (e.g., user@example.com)';
        } else {
          delete newWarnings.email;
        }
        break;
        
      case 'phone_number':
        if (value && !/^[0-9+\-\s()]{10,}$/.test(value)) {
          newWarnings.phone_number = 'Please enter a valid phone number (e.g., +40 123 456 789)';
        } else {
          delete newWarnings.phone_number;
        }
        break;
        
      case 'password':
        if (value) {
          if (value.length < 8) {
            newWarnings.password = 'Password should be at least 8 characters long';
          } else if (!/(?=.*[a-z])/.test(value)) {
            newWarnings.password = 'Password should contain at least one lowercase letter';
          } else if (!/(?=.*[A-Z])/.test(value)) {
            newWarnings.password = 'Password should contain at least one uppercase letter';
          } else if (!/(?=.*\d)/.test(value)) {
            newWarnings.password = 'Password should contain at least one number';
          } else {
            delete newWarnings.password;
          }
        }
        break;
        
      case 'confirmPassword':
        if (value && value !== formData.password) {
          newWarnings.confirmPassword = 'Passwords do not match';
        } else {
          delete newWarnings.confirmPassword;
        }
        break;
    }
    
    setWarnings(newWarnings);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validate field in real-time
    validateField(name, value);
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Name validation
    if (!formData.prenom) newErrors.prenom = 'First name is required';
    if (!formData.nom) newErrors.nom = 'Last name is required';
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Phone validation
    if (!formData.phone_number) {
      newErrors.phone_number = 'Phone number is required';
    } else if (!/^[0-9+\-\s()]{10,}$/.test(formData.phone_number)) {
      newErrors.phone_number = 'Please enter a valid phone number';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and numbers';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!directorId) {
      toast({
        title: 'Error',
        description: 'Could not identify the director. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${backend}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          institution_id: institutionId,
          created_by: directorId,
          accepted: true,
          verified: true,
          diffuse: true,
          upload: true,
          download: true,
          print: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'Email already exists') {
          setErrors(prev => ({
            ...prev,
            email: 'This email is already registered'
          }));
          throw new Error('Email already exists');
        }
        throw new Error(data.error || 'Failed to create user');
      }

      toast({
        title: 'User created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onUserAdded();
      onClose();
      setFormData({
        prenom: '',
        nom: '',
        email: '',
        phone_number: '',
        password: '',
        confirmPassword: '',
        roles: 'user',
      });
    } catch (error) {
      if (error.message !== 'Email already exists') {
        toast({
          title: 'Error creating user',
          description: error.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const RoleOption = ({ value, icon, label, description }) => (
    <HStack spacing={3} py={2} px={3}>
      <Icon as={icon} color={value === 'admin' ? 'purple.500' : 'green.500'} boxSize={5} />
      <VStack align="start" spacing={0}>
        <Text fontWeight="medium">{label}</Text>
        <Text fontSize="sm" color="gray.500">{description}</Text>
      </VStack>
    </HStack>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent bg={bgColor} borderRadius="xl" boxShadow="xl">
        <ModalHeader>
          <VStack align="start" spacing={2}>
            <HStack>
              <Icon as={FaUserPlus} color={iconColor} boxSize={6} />
              <Text fontSize="2xl" fontWeight="bold">Add New User</Text>
            </HStack>
            <HStack color="gray.500">
              <Icon as={FaBuilding} />
              <Text>Institution: {institutionName}</Text>
            </HStack>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />
        <Divider borderColor={borderColor} />
        <ModalBody py={6}>
          <form onSubmit={handleSubmit}>
            <VStack spacing={6}>
              <HStack spacing={4} width="100%">
                <FormControl isInvalid={errors.prenom} flex={1}>
                  <FormLabel>
                    <HStack>
                      <Icon as={FaUser} color={iconColor} />
                      <Text>First Name</Text>
                    </HStack>
                  </FormLabel>
                  <Input
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    size="lg"
                  />
                  <FormErrorMessage>{errors.prenom}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={errors.nom} flex={1}>
                  <FormLabel>
                    <HStack>
                      <Icon as={FaUser} color={iconColor} />
                      <Text>Last Name</Text>
                    </HStack>
                  </FormLabel>
                  <Input
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    size="lg"
                  />
                  <FormErrorMessage>{errors.nom}</FormErrorMessage>
                </FormControl>
              </HStack>

              <FormControl isInvalid={errors.email}>
                <FormLabel>
                  <HStack>
                    <Icon as={FaEnvelope} color={iconColor} />
                    <Text>Email Address</Text>
                  </HStack>
                </FormLabel>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  size="lg"
                />
                {warnings.email && (
                  <Alert status="warning" mt={2} size="sm" borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm">{warnings.email}</Text>
                  </Alert>
                )}
                <FormErrorMessage>{errors.email}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.phone_number}>
                <FormLabel>
                  <HStack>
                    <Icon as={FaPhone} color={iconColor} />
                    <Text>Phone Number</Text>
                  </HStack>
                </FormLabel>
                <Input
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="Enter phone number (e.g., +40 123 456 789)"
                  size="lg"
                />
                {warnings.phone_number && (
                  <Alert status="warning" mt={2} size="sm" borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm">{warnings.phone_number}</Text>
                  </Alert>
                )}
                <FormErrorMessage>{errors.phone_number}</FormErrorMessage>
              </FormControl>

              <HStack spacing={4} width="100%">
                <FormControl isInvalid={errors.password} flex={1}>
                  <FormLabel>
                    <HStack>
                      <Icon as={FaLock} color={iconColor} />
                      <Text>Password</Text>
                    </HStack>
                  </FormLabel>
                  <Input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    size="lg"
                  />
                  {warnings.password && (
                    <Alert status="warning" mt={2} size="sm" borderRadius="md">
                      <AlertIcon />
                      <Text fontSize="sm">{warnings.password}</Text>
                    </Alert>
                  )}
                  <FormErrorMessage>{errors.password}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={errors.confirmPassword} flex={1}>
                  <FormLabel>
                    <HStack>
                      <Icon as={FaLock} color={iconColor} />
                      <Text>Confirm Password</Text>
                    </HStack>
                  </FormLabel>
                  <Input
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    size="lg"
                  />
                  {warnings.confirmPassword && (
                    <Alert status="warning" mt={2} size="sm" borderRadius="md">
                      <AlertIcon />
                      <Text fontSize="sm">{warnings.confirmPassword}</Text>
                    </Alert>
                  )}
                  <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>
                  <HStack>
                    <Icon as={FaShieldAlt} color={iconColor} />
                    <Text>Role</Text>
                  </HStack>
                </FormLabel>
                <Select
                  name="roles"
                  value={formData.roles}
                  onChange={handleChange}
                  size="lg"
                  bg={selectBgColor}
                  borderColor={formData.roles === 'admin' ? 'purple.500' : 'green.500'}
                  _hover={{
                    borderColor: formData.roles === 'admin' ? 'purple.600' : 'green.600'
                  }}
                  _focus={{
                    borderColor: formData.roles === 'admin' ? 'purple.500' : 'green.500',
                    boxShadow: `0 0 0 1px ${formData.roles === 'admin' ? 'purple.500' : 'green.500'}`
                  }}
                >
                  <option value="user" style={{ padding: '12px' }}>
                    <HStack spacing={3}>
                      <Icon as={FaUserTie} color="green.500" boxSize={5} />
                      <Text>User</Text>
                    </HStack>
                  </option>
                  <option value="admin" style={{ padding: '12px' }}>
                    <HStack spacing={3}>
                      <Icon as={FaUserShield} color="purple.500" boxSize={5} />
                      <Text>Admin</Text>
                    </HStack>
                  </option>
                </Select>
              </FormControl>
            </VStack>
          </form>
        </ModalBody>
        <Divider borderColor={borderColor} />
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} size="lg">
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            leftIcon={<FaUserPlus />}
            onClick={handleSubmit}
            isLoading={isLoading}
            size="lg"
            px={8}
          >
            Add User
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AddUserModal; 