import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  Heading,
  Text,
  Spinner,
  useToast
} from '@chakra-ui/react';
import config from '../config';

const UserLogs = () => {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchLogs(selectedUser);
    } else {
      fetchLogs();
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/api/admin/users`);
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const fetchLogs = async (userId = '') => {
    try {
      setLoading(true);
      const url = userId
        ? `${config.apiUrl}/api/admin/user-logs?userId=${userId}`
        : `${config.apiUrl}/api/admin/user-logs`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch logs',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Box p={4}>
      <Heading mb={4}>User Activity Logs</Heading>
      
      <Box mb={4}>
        <Select
          placeholder="Select user"
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
        >
          <option value="">All Users</option>
          {users.map((user) => (
            <option key={user.id_user} value={user.id_user}>
              {user.prenom} {user.nom}
            </option>
          ))}
        </Select>
      </Box>

      {loading ? (
        <Box textAlign="center" py={4}>
          <Spinner />
        </Box>
      ) : logs.length === 0 ? (
        <Text textAlign="center" py={4}>
          No logs found
        </Text>
      ) : (
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>User</Th>
                <Th>Action</Th>
                <Th>Details</Th>
              </Tr>
            </Thead>
            <Tbody>
              {logs.map((log) => (
                <Tr key={log.id}>
                  <Td>{formatDate(log.created_at)}</Td>
                  <Td>{`${log.prenom} ${log.nom}`}</Td>
                  <Td>{log.action}</Td>
                  <Td>{log.details}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

export default UserLogs; 