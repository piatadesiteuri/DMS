import React from 'react';
import {
  Box,
  Grid,
  GridItem,
  Heading,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
} from '@chakra-ui/react';
import { FaFileAlt, FaUsers, FaFolder, FaChartLine } from 'react-icons/fa';

const Dashboard = () => {
  return (
    <Box>
      <Heading size="lg" mb={6}>Director Dashboard</Heading>
      
      {/* Stats Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Documents</StatLabel>
              <StatNumber>1,234</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                23.36%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Active Users</StatLabel>
              <StatNumber>45</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                9.05%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Folders</StatLabel>
              <StatNumber>89</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                5.2%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Storage Used</StatLabel>
              <StatNumber>2.4 GB</StatNumber>
              <StatHelpText>
                <StatArrow type="decrease" />
                1.2%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Quick Actions */}
      <Grid templateColumns="repeat(2, 1fr)" gap={6} mb={8}>
        <GridItem>
          <Card>
            <CardHeader>
              <Heading size="md">Quick Actions</Heading>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={2} spacing={4}>
                <Button leftIcon={<FaFileAlt />} colorScheme="blue" variant="outline">
                  New Document
                </Button>
                <Button leftIcon={<FaFolder />} colorScheme="blue" variant="outline">
                  New Folder
                </Button>
                <Button leftIcon={<FaUsers />} colorScheme="blue" variant="outline">
                  Manage Users
                </Button>
                <Button leftIcon={<FaChartLine />} colorScheme="blue" variant="outline">
                  View Reports
                </Button>
              </SimpleGrid>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card>
            <CardHeader>
              <Heading size="md">Recent Activity</Heading>
            </CardHeader>
            <CardBody>
              <Text>No recent activity to display</Text>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </Box>
  );
};

export default Dashboard; 