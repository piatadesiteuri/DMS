import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Input,
  Select,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Flex,
  useColorModeValue,
  Badge,
  IconButton,
  VStack,
  HStack,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Divider,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaTrash, FaEye, FaDownload, FaTags, FaCalendarAlt } from 'react-icons/fa';

const MotionBox = motion(Box);
const MotionCard = motion(Card);

const Search = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [searchParams, setSearchParams] = useState({
    name: '',
    type: '',
    keyword: '',
    author: '',
    startDate: '',
    endDate: '',
    selectedTags: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tags, setTags] = useState([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  useEffect(() => {
    // Fetch available tags when component mounts
    const fetchTags = async () => {
      try {
        const response = await fetch(`${window.location.origin}/tags`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setTags(data);
        }
      } catch (err) {
        console.error('Error fetching tags:', err);
      }
    };
    fetchTags();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${window.location.origin}/search`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams)
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      setError('Error performing search. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagToggle = (tagId) => {
    setSearchParams(prev => {
      const newTags = prev.selectedTags.includes(tagId)
        ? prev.selectedTags.filter(id => id !== tagId)
        : [...prev.selectedTags, tagId];
      return { ...prev, selectedTags: newTags };
    });
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Heading
            as="h1"
            size="2xl"
            bgGradient="linear(to-r, blue.500, purple.500)"
            bgClip="text"
            fontWeight="extrabold"
          >
            Search Documents
          </Heading>
          <Text fontSize="xl" color={useColorModeValue('gray.600', 'gray.400')} mt={2}>
            Find your documents using advanced search filters
          </Text>
        </MotionBox>

        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card
            bg={useColorModeValue('white', 'gray.800')}
            borderRadius="xl"
            boxShadow="lg"
            _hover={{ transform: 'translateY(-2px)', boxShadow: 'xl' }}
            transition="all 0.2s"
          >
            <CardBody p={6}>
              <form onSubmit={handleSearch}>
                <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
                  {/* Document Name */}
                  <FormControl>
                    <FormLabel>Document Name</FormLabel>
                    <Input
                      type="text"
                      name="name"
                      value={searchParams.name}
                      onChange={handleInputChange}
                      placeholder="Enter document name"
                      focusBorderColor="blue.500"
                    />
                  </FormControl>

                  {/* Document Type */}
                  <FormControl>
                    <FormLabel>Document Type</FormLabel>
                    <Select
                      name="type"
                      value={searchParams.type}
                      onChange={handleInputChange}
                      focusBorderColor="blue.500"
                    >
                      <option value="">All Types</option>
                      <option value="pdf">PDF</option>
                      <option value="doc">DOC</option>
                      <option value="docx">DOCX</option>
                      <option value="xls">XLS</option>
                      <option value="xlsx">XLSX</option>
                      <option value="txt">TXT</option>
                    </Select>
                  </FormControl>

                  {/* Keywords */}
                  <FormControl>
                    <FormLabel>Keywords</FormLabel>
                    <Input
                      type="text"
                      name="keyword"
                      value={searchParams.keyword}
                      onChange={handleInputChange}
                      placeholder="Enter keywords"
                      focusBorderColor="blue.500"
                    />
                  </FormControl>

                  {/* Author */}
                  <FormControl>
                    <FormLabel>Author</FormLabel>
                    <Input
                      type="text"
                      name="author"
                      value={searchParams.author}
                      onChange={handleInputChange}
                      placeholder="Enter author name"
                      focusBorderColor="blue.500"
                    />
                  </FormControl>

                  {/* Tags */}
                  <FormControl>
                    <FormLabel>Tags</FormLabel>
                    <Popover isOpen={isTagDropdownOpen} onClose={() => setIsTagDropdownOpen(false)}>
                      <PopoverTrigger>
                        <Button
                          rightIcon={<FaTags />}
                          w="full"
                          justifyContent="space-between"
                          variant="outline"
                          onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                        >
                          {searchParams.selectedTags.length > 0
                            ? `${searchParams.selectedTags.length} tags selected`
                            : 'Select tags'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <PopoverArrow />
                        <PopoverCloseButton />
                        <PopoverBody maxH="200px" overflowY="auto">
                          <VStack align="stretch" spacing={2}>
                            {tags.map(tag => (
                              <Button
                                key={tag.id_tag}
                                variant="ghost"
                                justifyContent="flex-start"
                                leftIcon={
                                  searchParams.selectedTags.includes(tag.id_tag) ? (
                                    <Box as="span" color="blue.500">✓</Box>
                                  ) : null
                                }
                                onClick={() => handleTagToggle(tag.id_tag)}
                              >
                                {tag.tag_name}
                              </Button>
                            ))}
                          </VStack>
                        </PopoverBody>
                      </PopoverContent>
                    </Popover>
                    {searchParams.selectedTags.length > 0 && (
                      <Flex wrap="wrap" gap={2} mt={2}>
                        {searchParams.selectedTags.map(tagId => {
                          const tag = tags.find(t => t.id_tag === tagId);
                          return tag ? (
                            <Badge
                              key={tagId}
                              colorScheme="blue"
                              px={2}
                              py={1}
                              borderRadius="full"
                            >
                              {tag.tag_name}
                              <IconButton
                                aria-label="Remove tag"
                                icon={<Box as="span">×</Box>}
                                size="xs"
                                variant="ghost"
                                ml={1}
                                onClick={() => handleTagToggle(tagId)}
                              />
                            </Badge>
                          ) : null;
                        })}
                      </Flex>
                    )}
                  </FormControl>

                  {/* Date Range */}
                  <FormControl>
                    <FormLabel>Date Range</FormLabel>
                    <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                      <Input
                        type="date"
                        name="startDate"
                        value={searchParams.startDate}
                        onChange={handleInputChange}
                        focusBorderColor="blue.500"
                      />
                      <Input
                        type="date"
                        name="endDate"
                        value={searchParams.endDate}
                        onChange={handleInputChange}
                        focusBorderColor="blue.500"
                      />
                    </Grid>
                  </FormControl>
                </Grid>

                <Flex justify="flex-end" mt={6}>
                  <Button
                    type="submit"
                    colorScheme="blue"
                    leftIcon={<FaSearch />}
                    isLoading={isLoading}
                    loadingText="Searching..."
                    size="lg"
                    _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                    transition="all 0.2s"
                  >
                    Search
                  </Button>
                </Flex>
              </form>
            </CardBody>
          </Card>
        </MotionBox>

        {error && (
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert status="error" borderRadius="lg">
              <AlertIcon />
              <AlertTitle>Error!</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </MotionBox>
        )}

        {searchResults.length > 0 && (
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card
              bg={useColorModeValue('white', 'gray.800')}
              borderRadius="xl"
              boxShadow="lg"
            >
              <CardHeader>
                <Heading size="md">
                  Search Results ({searchResults.length})
                </Heading>
              </CardHeader>
              <Divider />
              <CardBody>
                <Grid
                  templateColumns={{
                    base: '1fr',
                    md: 'repeat(2, 1fr)',
                    lg: 'repeat(3, 1fr)'
                  }}
                  gap={6}
                >
                  {searchResults.map((doc, index) => (
                    <MotionCard
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      bg={useColorModeValue('white', 'gray.700')}
                      borderRadius="lg"
                      overflow="hidden"
                      _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                      transition="all 0.2s"
                    >
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          <Heading size="sm">{doc.nom_document}</Heading>
                          <Text fontSize="sm" color="gray.500">
                            Type: {doc.type}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            Author: {doc.prenom} {doc.nom}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            Upload Date: {new Date(doc.date_upload).toLocaleDateString()}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            Keywords: {[doc.mot1, doc.mot2, doc.mot3, doc.mot4, doc.mot5].filter(Boolean).join(', ')}
                          </Text>
                        </VStack>
                      </CardBody>
                      <Divider />
                      <CardFooter>
                        <HStack spacing={2}>
                          <Button
                            leftIcon={<FaEye />}
                            colorScheme="blue"
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`${window.location.origin}/view/${doc.nom_document}`, '_blank')}
                          >
                            View
                          </Button>
                          <Button
                            leftIcon={<FaDownload />}
                            colorScheme="green"
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`${window.location.origin}/download/${doc.nom_document}`, '_blank')}
                          >
                            Download
                          </Button>
                        </HStack>
                      </CardFooter>
                    </MotionCard>
                  ))}
                </Grid>
              </CardBody>
            </Card>
          </MotionBox>
        )}
      </VStack>
    </Container>
  );
};

export default Search; 