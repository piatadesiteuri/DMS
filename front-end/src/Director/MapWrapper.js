import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Input,
  List,
  ListItem,
  Text,
  Button,
  Flex,
  useToast,
  InputGroup,
  InputLeftElement,
  Icon,
  VStack,
} from '@chakra-ui/react';
import { FaSearch, FaMapMarkerAlt } from 'react-icons/fa';

const MapWrapper = ({ onLocationSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapUrl, setMapUrl] = useState('https://www.openstreetmap.org/export/embed.html?bbox=20.0,43.0,30.0,48.0&layer=mapnik');
  const toast = useToast();

  const searchAddress = useCallback(async (query) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ro&limit=5`
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Error searching address:', error);
      toast({
        title: 'Error',
        description: 'Failed to search address',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [toast]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchAddress(searchTerm);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, searchAddress]);

  const handleSuggestionClick = async (suggestion) => {
    setSearchTerm(suggestion.display_name);
    setSuggestions([]);
    setSelectedLocation(suggestion);
    
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);
    const zoom = 16;
    const newMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.01},${lat-0.01},${lon+0.01},${lat+0.01}&layer=mapnik&center=${lat},${lon}&zoom=${zoom}&marker=${lat},${lon}`;
    setMapUrl(newMapUrl);
    
    if (onLocationSelect) {
      onLocationSelect(suggestion);
    }
  };

  const handleMapClick = async (event) => {
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const lat = 45.9432 + (y / rect.height) * (48.0 - 43.0);
    const lon = 20.0 + (x / rect.width) * (30.0 - 20.0);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      setSearchTerm(data.display_name);
      setSelectedLocation(data);
      
      // Center the map on the clicked location with a fixed zoom level
      const zoom = 16; // Fixed zoom level for street view
      const newMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.01},${lat-0.01},${lon+0.01},${lat+0.01}&layer=mapnik&center=${lat},${lon}&zoom=${zoom}`;
      setMapUrl(newMapUrl);
      
      if (onLocationSelect) {
        onLocationSelect(data);
      }
    } catch (error) {
      console.error('Error getting address:', error);
      toast({
        title: 'Error',
        description: 'Failed to get address',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box position="relative" width="100%">
      <Box 
        position="relative" 
        zIndex={10}
        bg="white"
        borderRadius="md"
        mb={2}
      >
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <Icon as={FaSearch} color="blue.300" />
          </InputLeftElement>
          <Input
            placeholder="Caută o stradă în România"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            bg="white"
            borderColor="blue.200"
            _hover={{ borderColor: 'blue.300' }}
            _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px blue.200' }}
            color="blue.700"
            _placeholder={{ color: 'blue.300' }}
          />
        </InputGroup>

        {suggestions.length > 0 && (
          <List
            position="absolute"
            zIndex={20}
            bg="white"
            width="100%"
            maxH="200px"
            overflowY="auto"
            boxShadow="md"
            borderRadius="md"
            mt={2}
            border="1px solid"
            borderColor="gray.200"
          >
            {suggestions.map((suggestion) => (
              <ListItem
                key={suggestion.place_id}
                p={2}
                cursor="pointer"
                _hover={{ bg: 'blue.50' }}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <Text>{suggestion.display_name}</Text>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <Box
        h="300px"
        borderRadius="md"
        overflow="hidden"
        border="1px solid"
        borderColor="gray.200"
        position="relative"
        zIndex={1}
        style={{
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          perspective: '1000px',
          willChange: 'transform'
        }}
      >
        <iframe
          src={mapUrl}
          width="100%"
          height="100%"
          style={{ 
            border: 'none',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            perspective: '1000px',
            willChange: 'transform'
          }}
        />
      </Box>
    </Box>
  );
};

export default MapWrapper; 