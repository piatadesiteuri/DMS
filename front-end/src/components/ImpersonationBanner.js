import React, { useState, memo, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Alert,
  AlertIcon,
  HStack,
  VStack,
  Icon,
  Badge,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Avatar,
  Divider,
  ButtonGroup,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaUserSecret, 
  FaSignOutAlt, 
  FaExclamationTriangle,
  FaEye,
  FaArrowLeft,
  FaShieldAlt,
  FaTimes,
  FaChevronDown
} from 'react-icons/fa';
import { backend } from '../config';
import useImpersonation from '../hooks/useImpersonation';

const MotionBox = motion(Box);

const ImpersonationBanner = ({ 
  currentUser, 
  originalUser, 
  onStopImpersonation,
  isVisible = true 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalActive, setIsModalActive] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const { stopImpersonation, forceRefresh } = useImpersonation();

  // Simple modal detection
  useEffect(() => {
    const checkForModals = () => {
      // Simple check for modal overlays
      const modalOverlays = document.querySelectorAll('[data-modal], .chakra-modal__overlay, [role="dialog"]');
      const hasModal = modalOverlays.length > 0;
      setIsModalActive(hasModal);
    };

    // Check periodically
    const interval = setInterval(checkForModals, 500);
    return () => clearInterval(interval);
  }, []);

  const handleStopImpersonation = async () => {
    console.log('🛑 Starting stop impersonation process via hook...');
    setIsLoading(true);
    
    try {
      const data = await stopImpersonation();
      console.log('🛑 Stop impersonation successful via hook:', data);
      
      // Simple success toast
      toast({
        title: 'Impersonare oprită',
        description: `Te-ai întors ca ${originalUser?.prenom} ${originalUser?.nom}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right'
      });

      // Clear localStorage and force refresh
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userRole');
      
      // Force refresh of impersonation state
      forceRefresh();
      
      // Force immediate redirect to superadmin users page
      console.log('🛑 Forcing redirect to superadmin users page...');
      setTimeout(() => {
        window.location.href = '/superadmin/users';
      }, 500);

      if (onStopImpersonation) {
        onStopImpersonation(data);
      }
    } catch (error) {
      console.error('🛑 Stop impersonation error via hook:', error);
      
      // Simple error toast
      toast({
        title: 'Eroare la oprirea impersonării',
        description: error.message || 'Nu s-a putut opri impersonarea. Încearcă din nou.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right'
      });
    } finally {
      setIsLoading(false);
      onClose();
      setIsExpanded(false);
    }
  };

  // Debug logging - commented out to reduce console spam
  // console.log('🎭 ImpersonationBanner props:', {
  //   isVisible,
  //   hasCurrentUser: !!currentUser,
  //   hasOriginalUser: !!originalUser,
  //   currentUserRole: currentUser?.roles,
  //   originalUserRole: originalUser?.roles,
  //   isModalActive
  // });

  if (!isVisible || !currentUser || !originalUser) {
    // console.log('🎭 Banner not showing because:', {
    //   isVisible,
    //   hasCurrentUser: !!currentUser,
    //   hasOriginalUser: !!originalUser,
    //   reason: !isVisible ? 'isVisible is false' : 
    //           !currentUser ? 'no currentUser' : 
    //           !originalUser ? 'no originalUser' : 'unknown'
    // });
    return null;
  }

  return (
    <AnimatePresence>
      {/* Border around navbar with indicator */}
      <MotionBox
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={9998}
        pointerEvents="none"
      >
        {/* Top border - more transparent when modal is active */}
        <Box
          h="3px"
          bg={isModalActive 
            ? "linear-gradient(90deg, rgba(99, 102, 241, 0.3) 0%, rgba(79, 70, 229, 0.3) 50%, rgba(55, 48, 163, 0.3) 100%)"
            : "linear-gradient(90deg, #6366f1 0%, #4f46e5 50%, #3730a3 100%)"
          }
          position="relative"
        >
          {/* Animated shimmer effect - only when no modal */}
          {!isModalActive && (
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bg="linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)"
              animation="shimmer 3s infinite"
              sx={{
                '@keyframes shimmer': {
                  '0%': { transform: 'translateX(-100%)' },
                  '100%': { transform: 'translateX(100%)' }
                }
              }}
            />
          )}
        </Box>

        {/* Left border - more transparent when modal is active */}
        <Box
          position="absolute"
          top={0}
          left={0}
          w="3px"
          h="64px"
          bg={isModalActive 
            ? "linear-gradient(180deg, rgba(99, 102, 241, 0.3) 0%, rgba(79, 70, 229, 0.3) 100%)"
            : "linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)"
          }
        />

        {/* Right border - more transparent when modal is active */}
        <Box
          position="absolute"
          top={0}
          right={0}
          w="3px"
          h="64px"
          bg={isModalActive 
            ? "linear-gradient(180deg, rgba(99, 102, 241, 0.3) 0%, rgba(79, 70, 229, 0.3) 100%)"
            : "linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)"
          }
        />

        {/* Bottom border with indicator - more transparent when modal is active */}
        <Box
          position="absolute"
          top="61px"
          left={0}
          right={0}
          h="3px"
          bg={isModalActive 
            ? "linear-gradient(90deg, rgba(99, 102, 241, 0.3) 0%, rgba(79, 70, 229, 0.3) 50%, rgba(55, 48, 163, 0.3) 100%)"
            : "linear-gradient(90deg, #6366f1 0%, #4f46e5 50%, #3730a3 100%)"
          }
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {/* Discreet indicator in the middle - smaller when modal is active */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              position: 'absolute',
              top: '-12px',
              display: 'flex',
              alignItems: 'center',
              gap: isModalActive ? '4px' : '6px',
              padding: isModalActive ? '4px 8px' : '6px 12px',
              backgroundColor: isModalActive ? 'rgba(79, 70, 229, 0.7)' : '#4f46e5',
              color: 'white',
              fontSize: isModalActive ? '10px' : '11px',
              fontWeight: '600',
              borderRadius: '20px',
              border: '2px solid white',
              cursor: 'pointer',
              boxShadow: isModalActive 
                ? '0 2px 8px rgba(79, 70, 229, 0.3)'
                : '0 4px 12px rgba(79, 70, 229, 0.4)',
              transition: 'all 0.2s ease',
              pointerEvents: 'auto',
              zIndex: 9999
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = isModalActive ? 'rgba(55, 48, 163, 0.8)' : '#3730a3';
              e.target.style.transform = 'translateY(-2px) scale(1.05)';
              e.target.style.boxShadow = isModalActive 
                ? '0 4px 12px rgba(79, 70, 229, 0.4)'
                : '0 6px 16px rgba(79, 70, 229, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = isModalActive ? 'rgba(79, 70, 229, 0.7)' : '#4f46e5';
              e.target.style.transform = 'translateY(0) scale(1)';
              e.target.style.boxShadow = isModalActive 
                ? '0 2px 8px rgba(79, 70, 229, 0.3)'
                : '0 4px 12px rgba(79, 70, 229, 0.4)';
            }}
          >
            <FaUserSecret style={{ width: isModalActive ? '8px' : '10px', height: isModalActive ? '8px' : '10px' }} />
            <span>ADMIN</span>
            <FaChevronDown 
              style={{ 
                width: isModalActive ? '6px' : '8px', 
                height: isModalActive ? '6px' : '8px',
                transition: 'transform 0.2s ease',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
              }} 
            />
          </motion.button>
        </Box>
      </MotionBox>

      {/* Expanded Panel - Below the navbar */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: '67px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              backgroundColor: 'white',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e5e7eb',
              zIndex: 10000,
              overflow: 'hidden',
              pointerEvents: 'auto'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaUserSecret style={{ width: '16px', height: '16px' }} />
                <span style={{ fontSize: '14px', fontWeight: '600' }}>IMPERSONARE ACTIVĂ</span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = 'white';
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = 'rgba(255, 255, 255, 0.8)';
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                <FaTimes style={{ width: '12px', height: '12px' }} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* User Info */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '20px',
                    margin: '0 auto 12px',
                    boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)'
                  }}>
                    {currentUser?.prenom?.charAt(0)}{currentUser?.nom?.charAt(0)}
                  </div>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 4px' }}>
                    {currentUser?.prenom} {currentUser?.nom}
                  </p>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Utilizator Impersonat</p>
                </div>

                {/* Divider */}
                <div style={{ 
                  height: '1px', 
                  background: 'linear-gradient(90deg, transparent, #e5e7eb, transparent)',
                  margin: '4px 0'
                }} />

                {/* Stop Button */}
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    onOpen();
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    backgroundColor: '#4f46e5',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#3730a3';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#4f46e5';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
                  }}
                >
                  <FaTimes style={{ width: '12px', height: '12px' }} />
                  <span>Oprește Impersonarea</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
        <ModalOverlay 
          bg="blackAlpha.600"
          backdropFilter="blur(10px)"
        />
        <MotionBox
          as={ModalContent}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
          borderRadius="2xl"
          overflow="hidden"
        >
          <Box
            bgGradient="linear(to-r, purple.600, blue.600)"
            color="white"
            p={6}
          >
            <ModalHeader fontSize="xl" fontWeight="bold" p={0}>
              <HStack spacing={3}>
                <Icon as={FaShieldAlt} boxSize={6} />
                <Text>Oprește Impersonarea</Text>
              </HStack>
            </ModalHeader>
          </Box>
          
          <ModalBody p={6}>
            <VStack spacing={6} align="stretch">
              <Alert status="warning" borderRadius="lg" bg="orange.50">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="600" color="orange.800">
                    Confirmare necesară
                  </Text>
                  <Text fontSize="sm" color="orange.700">
                    Vei fi deconectat de la contul curent și întors la panoul SuperAdmin
                  </Text>
                </VStack>
              </Alert>

              <Box bg="gray.50" p={4} borderRadius="lg">
                <VStack spacing={4}>
                  <HStack spacing={4} w="full">
                    <VStack flex={1} align="center" spacing={2}>
                      <Avatar
                        name={`${currentUser.prenom} ${currentUser.nom}`}
                        bg="purple.500"
                        color="white"
                      />
                      <VStack spacing={0}>
                        <Text fontWeight="600" fontSize="sm" textAlign="center">
                          {currentUser.prenom} {currentUser.nom}
                        </Text>
                        <Badge colorScheme="purple" fontSize="xs">
                          Cont Curent
                        </Badge>
                      </VStack>
                    </VStack>

                    <Icon as={FaArrowLeft} color="gray.400" boxSize={6} />

                    <VStack flex={1} align="center" spacing={2}>
                      <Avatar
                        name={`${originalUser.prenom} ${originalUser.nom}`}
                        bg="blue.500"
                        color="white"
                      />
                      <VStack spacing={0}>
                        <Text fontWeight="600" fontSize="sm" textAlign="center">
                          {originalUser.prenom} {originalUser.nom}
                        </Text>
                        <Badge colorScheme="blue" fontSize="xs">
                          SuperAdmin
                        </Badge>
                      </VStack>
                    </VStack>
                  </HStack>
                </VStack>
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter p={6} bg="gray.50">
            <HStack spacing={3}>
              <Button
                variant="ghost"
                onClick={onClose}
                borderRadius="lg"
                _hover={{ bg: 'gray.100' }}
              >
                Anulează
              </Button>
              <Button
                colorScheme="purple"
                onClick={handleStopImpersonation}
                isLoading={isLoading}
                loadingText="Se oprește..."
                leftIcon={<FaSignOutAlt />}
                borderRadius="lg"
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg'
                }}
                transition="all 0.2s"
              >
                Oprește Impersonarea
              </Button>
            </HStack>
          </ModalFooter>
        </MotionBox>
      </Modal>
    </AnimatePresence>
  );
};

export default memo(ImpersonationBanner); 