import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  useToast,
  Card,
  CardHeader,
  CardBody,
  useColorModeValue,
  IconButton,
  Tooltip,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Spinner,
  Center,
  Badge,
  Icon,
  Select,
  FormControl,
  FormLabel,
  SimpleGrid,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Input,
} from '@chakra-ui/react';
import { 
  FaFolder, 
  FaFilePdf, 
  FaArrowLeft, 
  FaArrowRight,
  FaPlus,
  FaUpload,
  FaDownload,
  FaTrash,
  FaHome,
  FaEllipsisV,
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { backend } from '../config';
import {
  ChevronRightIcon,
  EditIcon,
  DeleteIcon,
  DownloadIcon,
} from '@chakra-ui/icons';

const MotionBox = motion(Box);

const Folders = () => {
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderHistory, setFolderHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const navigate = useNavigate();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const [isOpen, setIsOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const buildFolderStructure = (items) => {
    console.log('Building folder structure for items:', items);
    
    // Sortăm elementele după path pentru a asigura ordinea corectă
    const sortedItems = [...items].sort((a, b) => a.path.localeCompare(b.path));
    console.log('Sorted items:', sortedItems);
    
    const folderMap = new Map();
    const rootItems = [];

    // Prima trecere: creăm maparea pentru toate folderele
    sortedItems.forEach(item => {
      if (item.type === 'folder') {
        const pathParts = item.path.split('/').filter(Boolean);
        const folder = {
          ...item,
          children: []
        };
        
        if (pathParts.length === 1) {
          // Este un folder din rădăcină
          rootItems.push(folder);
        }
        folderMap.set(item.path, folder);
      }
    });

    // A doua trecere: organizăm elementele în structura ierarhică
    sortedItems.forEach(item => {
      if (item.type === 'folder') {
        const pathParts = item.path.split('/').filter(Boolean);
        if (pathParts.length > 1) {
          // Este un subfolder
          const parentPath = pathParts.slice(0, -1).join('/');
          const parentFolder = folderMap.get(parentPath);
          if (parentFolder) {
            parentFolder.children.push(folderMap.get(item.path));
          }
        }
      } else {
        // Pentru documente
        const pathParts = item.path.split('/').filter(Boolean);
        if (pathParts.length === 1) {
          // Documente din rădăcină
          rootItems.push(item);
        } else {
          // Documente din subfoldere
          const parentPath = pathParts.slice(0, -1).join('/');
          const parentFolder = folderMap.get(parentPath);
          if (parentFolder) {
            parentFolder.children.push(item);
          }
        }
      }
    });

    console.log('Final root items:', rootItems);
    return rootItems;
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      const response = await fetch(`${backend}/post_docs/institutions`, {
        credentials: 'include',
        headers: {
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch institutions');
      }

      const data = await response.json();
      setInstitutions(data);
      
      // If there are institutions, select the first one by default
      if (data.length > 0) {
        setSelectedInstitution(data[0]);
        fetchFolders(data[0].id_institution);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const fetchFolders = async (institutionId) => {
    try {
      setLoading(true);
      const response = await fetch(`${backend}/post_docs/institutions/${institutionId}/folders`, {
        credentials: 'include',
        headers: {
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }

      const data = await response.json();
      if (data.success) {
        const hierarchicalItems = buildFolderStructure(data.items);
        setFolders(hierarchicalItems);
        setCurrentFolder(null);
        setFolderHistory([]);
      } else {
        throw new Error(data.error || 'Failed to fetch folders');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const findFolderByPath = (path) => {
    const findInItems = (items, targetPath) => {
      for (const item of items) {
        if (item.type === 'folder' && item.path === targetPath) {
          return item;
        }
        if (item.children) {
          const found = findInItems(item.children, targetPath);
          if (found) return found;
        }
      }
      return null;
    };

    return findInItems(folders, path);
  };

  const getCurrentItems = () => {
    if (!currentFolder) {
      // La rădăcină, afișăm doar folderele și documentele din rădăcină
      return folders.filter(item => {
        const pathParts = item.path.split('/').filter(Boolean);
        return pathParts.length === 1;
      });
    }

    // Când suntem într-un folder, afișăm doar elementele directe din acel folder
    const currentFolderPath = currentFolder.path;
    const currentFolderData = folders.find(f => f.path === currentFolderPath);
    
    if (currentFolderData && currentFolderData.children) {
      return currentFolderData.children;
    }

    // Dacă nu găsim folderul în structura ierarhică, încercăm să găsim elementele directe
    return folders.filter(item => {
      if (item.type === 'folder') {
        const pathParts = item.path.split('/').filter(Boolean);
        const parentPath = pathParts.slice(0, -1).join('/');
        return parentPath === currentFolderPath;
      }
      return item.path === currentFolderPath;
    });
  };

  const getBreadcrumbItems = () => {
    const items = [];
    if (currentFolder) {
      const pathParts = currentFolder.path.split('/').filter(Boolean);
      let currentPath = '';
      
      pathParts.forEach((part, index) => {
        currentPath += (index === 0 ? '' : '/') + part;
        items.push({
          name: part,
          path: currentPath
        });
      });
    }
    return items;
  };

  const handleInstitutionChange = (institution) => {
    setSelectedInstitution(institution);
    fetchFolders(institution.id_institution);
  };

  const handleFolderClick = async (folder) => {
    if (folder.type === 'folder') {
      try {
        setLoading(true);
        console.log('Fetching contents for folder:', folder);
        
        const response = await fetch(`${backend}/post_docs/institutions/${selectedInstitution.id_institution}/folders?path=${encodeURIComponent(folder.path)}`, {
          credentials: 'include',
          headers: {
            'Origin': window.location.origin
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch folder contents');
        }

        const data = await response.json();
        console.log('Received folder contents:', data);
        
        if (data.success) {
          // Actualizăm starea folderului curent și istoricul
          setCurrentFolder(folder);
          setFolderHistory(prev => [...prev, currentFolder]);
          
          // Construim structura ierarhică a folderelor și documentelor
          const hierarchicalItems = buildFolderStructure(data.items);
          console.log('Final hierarchical structure:', hierarchicalItems);
          
          // Actualizăm structura completă a folderelor
          const updatedFolders = folders.map(f => {
            if (f.path === folder.path) {
              return {
                ...f,
                children: hierarchicalItems
              };
            }
            return f;
          });
          
          setFolders(updatedFolders);
        }
      } catch (error) {
        console.error('Error in handleFolderClick:', error);
        toast({
          title: 'Error',
          description: error.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleNavigateBack = async () => {
    if (folderHistory.length > 0) {
      const previousFolder = folderHistory[folderHistory.length - 1];
      setCurrentFolder(previousFolder);
      setFolderHistory(folderHistory.slice(0, -1));
      
      try {
        const response = await fetch(`${backend}/post_docs/institutions/${selectedInstitution.id_institution}/folders?path=${encodeURIComponent(previousFolder ? previousFolder.path : '')}`, {
          credentials: 'include',
          headers: {
            'Origin': window.location.origin
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch folder contents');
        }

        const data = await response.json();
        if (data.success) {
          // Construim structura ierarhică a folderelor și documentelor
          const buildFolderStructure = (items) => {
            const sortedItems = [...items].sort((a, b) => a.path.localeCompare(b.path));
            const folderMap = new Map();
            const rootItems = [];

            // Prima trecere: creăm maparea pentru toate folderele
            sortedItems.forEach(item => {
              if (item.type === 'folder') {
                folderMap.set(item.path, {
                  ...item,
                  children: []
                });
              }
            });

            // A doua trecere: organizăm elementele în structura ierarhică
            sortedItems.forEach(item => {
              if (item.type === 'folder') {
                // Pentru foldere, verificăm dacă sunt în rădăcină sau subfolder
                const pathParts = item.path.split('/').filter(Boolean);
                if (pathParts.length === 1) {
                  // Este un folder din rădăcină
                  rootItems.push(folderMap.get(item.path));
                } else {
                  // Este un subfolder
                  const parentPath = pathParts.slice(0, -1).join('/');
                  const parentFolder = folderMap.get(parentPath);
                  if (parentFolder) {
                    parentFolder.children.push(folderMap.get(item.path));
                  }
                }
              } else {
                // Pentru documente, le adăugăm în folderul părinte
                const parentPath = item.path;
                const parentFolder = folderMap.get(parentPath);
                if (parentFolder) {
                  parentFolder.children.push(item);
                }
              }
            });

            return rootItems;
          };

          const hierarchicalItems = buildFolderStructure(data.items);
          setFolders(hierarchicalItems);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: error.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } else {
      // Când mergem înapoi la root, reîncărcăm toate folderele
      setCurrentFolder(null);
      setFolderHistory([]);
      fetchFolders(selectedInstitution.id_institution);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onOpen = () => {
    setIsOpen(true);
    setNewFolderName('');
  };

  const onClose = () => {
    setIsOpen(false);
  };

  const handleCreateFolder = async () => {
    try {
      setIsCreating(true);
      const response = await fetch(`${backend}/post_docs/institutions/${selectedInstitution.id_institution}/folders`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({ name: newFolderName })
      });

      if (!response.ok) {
        throw new Error('Failed to create folder');
      }

      const data = await response.json();
      if (data.success) {
        fetchFolders(selectedInstitution.id_institution);
        onClose();
      } else {
        throw new Error(data.error || 'Failed to create folder');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditFolder = async (folder) => {
    try {
      const newName = prompt('Enter new folder name:', folder.name);
      if (!newName || newName === folder.name) return;

      const response = await fetch(`${backend}/post_docs/institutions/${selectedInstitution.id_institution}/folders/${folder.id}`, {
        credentials: 'include',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({ name: newName })
      });

      if (!response.ok) {
        throw new Error('Failed to edit folder');
      }

      const data = await response.json();
      if (data.success) {
        fetchFolders(selectedInstitution.id_institution);
        toast({
          title: 'Success',
          description: 'Folder renamed successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(data.error || 'Failed to edit folder');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!window.confirm(`Are you sure you want to delete the folder "${folder.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${backend}/post_docs/institutions/${selectedInstitution.id_institution}/folders/${folder.id}`, {
        credentials: 'include',
        method: 'DELETE',
        headers: {
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete folder');
      }

      const data = await response.json();
      if (data.success) {
        fetchFolders(selectedInstitution.id_institution);
        toast({
          title: 'Success',
          description: 'Folder deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(data.error || 'Failed to delete folder');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDownloadDocument = async (document) => {
    try {
      const response = await fetch(`${backend}/post_docs/institutions/${selectedInstitution.id_institution}/documents/${document.id}/download`, {
        credentials: 'include',
        headers: {
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteDocument = async (document) => {
    if (!window.confirm(`Are you sure you want to delete the document "${document.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${backend}/post_docs/institutions/${selectedInstitution.id_institution}/documents/${document.id}`, {
        credentials: 'include',
        method: 'DELETE',
        headers: {
          'Origin': window.location.origin
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      const data = await response.json();
      if (data.success) {
        fetchFolders(selectedInstitution.id_institution);
        toast({
          title: 'Success',
          description: 'Document deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(data.error || 'Failed to delete document');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <VStack spacing={8} align="stretch">
          <HStack justify="space-between">
            <HStack>
              <IconButton
                icon={<FaArrowLeft />}
                variant="ghost"
                onClick={() => navigate('/director/dashboard')}
                aria-label="Go back"
              />
              <Heading size="xl">Folders & Documents</Heading>
            </HStack>
            <HStack>
              <Button
                leftIcon={<FaPlus />}
                colorScheme="blue"
                size="sm"
                onClick={onOpen}
              >
                Create Folder
              </Button>
              <Button
                leftIcon={<FaUpload />}
                colorScheme="blue"
                size="sm"
                onClick={() => {/* TODO: Implement upload */}}
              >
                Upload
              </Button>
            </HStack>
          </HStack>

          <Card bg={cardBg} border="1px" borderColor={borderColor} boxShadow="lg">
            <CardHeader>
              <VStack align="stretch" spacing={4}>
                <HStack justify="space-between">
                  <HStack>
                    <Icon as={FaFolder} color="blue.500" boxSize={6} />
                    <Heading size="md">Institution Folders</Heading>
                  </HStack>
                  <FormControl maxW="300px">
                    <FormLabel fontSize="sm" color={textColor}>Select Institution</FormLabel>
                    <Select
                      value={selectedInstitution?.id_institution || ''}
                      onChange={(e) => {
                        const selected = institutions.find(inst => inst.id_institution.toString() === e.target.value);
                        if (selected) {
                          handleInstitutionChange(selected);
                        }
                      }}
                      placeholder="Select an institution"
                      size="sm"
                      bg="white"
                      borderColor="gray.200"
                      _hover={{ borderColor: 'blue.300' }}
                      _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                    >
                      {institutions.map((institution) => (
                        <option key={institution.id_institution} value={institution.id_institution}>
                          {institution.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </HStack>
                <Breadcrumb>
                  <BreadcrumbItem>
                    <BreadcrumbLink onClick={() => {
                      setCurrentFolder(null);
                      setFolderHistory([]);
                      fetchFolders(selectedInstitution.id_institution);
                    }}>
                      <HStack>
                        <Icon as={FaHome} />
                        <Text>Root</Text>
                      </HStack>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {getBreadcrumbItems().map((item, index) => (
                    <BreadcrumbItem key={index}>
                      <BreadcrumbLink onClick={() => {
                        const folder = findFolderByPath(item.path);
                        if (folder) {
                          setCurrentFolder(folder);
                          setFolderHistory(getBreadcrumbItems().slice(0, index + 1).map(i => 
                            findFolderByPath(i.path)
                          ));
                        }
                      }}>
                        {item.name}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  ))}
                </Breadcrumb>
              </VStack>
            </CardHeader>
            <CardBody>
              {loading ? (
                <Center py={10}>
                  <Spinner size="xl" color="blue.500" />
                </Center>
              ) : getCurrentItems().length === 0 ? (
                <Center py={10}>
                  <VStack spacing={4}>
                    <Icon as={FaFolder} boxSize={10} color="gray.400" />
                    <Text color={textColor}>No items in this folder</Text>
                  </VStack>
                </Center>
              ) : (
                <Box p={4}>
                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between">
                      <Heading size="lg">Folders</Heading>
                      <Button
                        leftIcon={<FaPlus />}
                        colorScheme="blue"
                        onClick={onOpen}
                      >
                        Create Folder
                      </Button>
                    </HStack>

                    {/* Breadcrumb Navigation */}
                    <HStack spacing={2}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setCurrentFolder(null);
                          setFolderHistory([]);
                        }}
                      >
                        Root
                      </Button>
                      {getBreadcrumbItems().map((item, index) => (
                        <HStack key={index} spacing={2}>
                          <ChevronRightIcon />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const folder = findFolderByPath(item.path);
                              if (folder) {
                                setCurrentFolder(folder);
                                setFolderHistory(folderHistory.slice(0, index));
                              }
                            }}
                          >
                            {item.name}
                          </Button>
                        </HStack>
                      ))}
                    </HStack>

                    {/* Folder Grid */}
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                      {getCurrentItems().map((item) => (
                        <Card
                          key={item.id}
                          p={4}
                          cursor={item.type === 'folder' ? 'pointer' : 'default'}
                          onClick={(e) => {
                            e.preventDefault();
                            if (item.type === 'folder') {
                              handleFolderClick(item);
                            }
                          }}
                          _hover={{
                            bg: item.type === 'folder' ? 'gray.50' : 'transparent',
                            transform: 'translateY(-2px)',
                            shadow: 'md'
                          }}
                          transition="all 0.2s"
                        >
                          <HStack spacing={4}>
                            <Box
                              p={2}
                              borderRadius="md"
                              bg={item.type === 'folder' ? 'blue.50' : 'red.50'}
                            >
                              {item.type === 'folder' ? (
                                <FaFolder size={24} color="#3182CE" />
                              ) : (
                                <FaFilePdf size={24} color="#E53E3E" />
                              )}
                            </Box>
                            <VStack align="start" spacing={1} flex={1}>
                              <Text fontWeight="bold" noOfLines={1}>
                                {item.name}
                              </Text>
                              <Text fontSize="sm" color="gray.500">
                                {item.type === 'folder' ? 'Folder' : 'Document'}
                              </Text>
                              {item.type === 'file' && (
                                <Text fontSize="xs" color="gray.400">
                                  {formatFileSize(item.size)}
                                </Text>
                              )}
                            </VStack>
                            <Menu>
                              <MenuButton
                                as={IconButton}
                                icon={<FaEllipsisV />}
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                              />
                              <MenuList>
                                {item.type === 'folder' ? (
                                  <>
                                    <MenuItem icon={<EditIcon />} onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleEditFolder(item);
                                    }}>
                                      Edit
                                    </MenuItem>
                                    <MenuItem icon={<DeleteIcon />} onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDeleteFolder(item);
                                    }}>
                                      Delete
                                    </MenuItem>
                                  </>
                                ) : (
                                  <>
                                    <MenuItem icon={<DownloadIcon />} onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDownloadDocument(item);
                                    }}>
                                      Download
                                    </MenuItem>
                                    <MenuItem icon={<DeleteIcon />} onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDeleteDocument(item);
                                    }}>
                                      Delete
                                    </MenuItem>
                                  </>
                                )}
                              </MenuList>
                            </Menu>
                          </HStack>
                        </Card>
                      ))}
                    </SimpleGrid>
                  </VStack>
                </Box>
              )}
            </CardBody>
          </Card>

          {/* Create Folder Modal */}
          <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Create New Folder</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <FormControl>
                  <FormLabel>Folder Name</FormLabel>
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name"
                  />
                </FormControl>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" mr={3} onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={handleCreateFolder}
                  isLoading={isCreating}
                >
                  Create
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </VStack>
      </MotionBox>
    </Container>
  );
};

export default Folders; 