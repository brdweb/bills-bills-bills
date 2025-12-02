import { useState, useEffect } from 'react';
import {
  Stack,
  Table,
  Button,
  ActionIcon,
  Group,
  TextInput,
  PasswordInput,
  Select,
  Modal,
  Checkbox,
  Text,
  Badge,
  Paper,
  Loader,
  Center,
} from '@mantine/core';
import { IconTrash, IconEdit, IconPlus } from '@tabler/icons-react';
import type { User, Database } from '../../api/client';
import {
  getUsers,
  addUser,
  deleteUser,
  getDatabases,
  getUserDatabases,
  grantDatabaseAccess,
  revokeDatabaseAccess,
} from '../../api/client';

export function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);

  // Add user form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<string>('user');
  const [selectedDatabases, setSelectedDatabases] = useState<number[]>([]);
  const [addLoading, setAddLoading] = useState(false);

  // Edit access modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userDatabases, setUserDatabases] = useState<number[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, dbsRes] = await Promise.all([getUsers(), getDatabases()]);
      setUsers(usersRes.data);
      setDatabases(dbsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUsername || !newPassword) return;

    setAddLoading(true);
    try {
      await addUser(newUsername, newPassword, newRole, selectedDatabases);
      await fetchData();
      setShowAddForm(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      setSelectedDatabases([]);
    } catch (error) {
      console.error('Failed to add user:', error);
      alert('Failed to add user');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await deleteUser(userId);
      await fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleEditAccess = async (user: User) => {
    setEditingUser(user);
    setAccessLoading(true);
    try {
      const response = await getUserDatabases(user.id);
      setUserDatabases(response.data.map((db) => db.id!));
    } catch (error) {
      console.error('Failed to fetch user databases:', error);
    } finally {
      setAccessLoading(false);
    }
  };

  const handleSaveAccess = async () => {
    if (!editingUser) return;

    setAccessLoading(true);
    try {
      // Get current databases
      const currentRes = await getUserDatabases(editingUser.id);
      const currentDbIds = currentRes.data.map((db) => db.id!);

      // Find databases to add and remove
      const toAdd = userDatabases.filter((id) => !currentDbIds.includes(id));
      const toRemove = currentDbIds.filter((id) => !userDatabases.includes(id));

      // Perform updates
      await Promise.all([
        ...toAdd.map((dbId) => grantDatabaseAccess(dbId, editingUser.id)),
        ...toRemove.map((dbId) => revokeDatabaseAccess(dbId, editingUser.id)),
      ]);

      setEditingUser(null);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update access');
    } finally {
      setAccessLoading(false);
    }
  };

  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Username</Table.Th>
            <Table.Th>Role</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {users.map((user) => (
            <Table.Tr key={user.id}>
              <Table.Td>{user.username}</Table.Td>
              <Table.Td>
                <Badge color={user.role === 'admin' ? 'orange' : 'blue'}>
                  {user.role}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    onClick={() => handleEditAccess(user)}
                    title="Edit Access"
                  >
                    <IconEdit size={18} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => handleDeleteUser(user.id)}
                    title="Delete"
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {!showAddForm ? (
        <Button
          leftSection={<IconPlus size={16} />}
          variant="light"
          onClick={() => setShowAddForm(true)}
        >
          Add User
        </Button>
      ) : (
        <Paper p="md" withBorder>
          <Stack gap="sm">
            <Text fw={500}>Add New User</Text>
            <Group grow>
              <TextInput
                label="Username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.currentTarget.value)}
                placeholder="Enter username"
              />
              <PasswordInput
                label="Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.currentTarget.value)}
                placeholder="Enter password"
              />
              <Select
                label="Role"
                value={newRole}
                onChange={(val) => setNewRole(val || 'user')}
                data={[
                  { value: 'user', label: 'User' },
                  { value: 'admin', label: 'Admin' },
                ]}
              />
            </Group>

            <Text size="sm" fw={500}>
              Database Access
            </Text>
            <Group>
              {databases.map((db) => (
                <Checkbox
                  key={db.id}
                  label={db.display_name}
                  checked={selectedDatabases.includes(db.id!)}
                  onChange={(e) => {
                    if (e.currentTarget.checked) {
                      setSelectedDatabases([...selectedDatabases, db.id!]);
                    } else {
                      setSelectedDatabases(selectedDatabases.filter((id) => id !== db.id));
                    }
                  }}
                />
              ))}
            </Group>

            <Group>
              <Button onClick={handleAddUser} loading={addLoading}>
                Create User
              </Button>
              <Button variant="default" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      {/* Edit Access Modal */}
      <Modal
        opened={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Database Access: ${editingUser?.username}`}
        centered
      >
        <Stack gap="md">
          {accessLoading ? (
            <Center py="md">
              <Loader />
            </Center>
          ) : (
            <>
              {databases.map((db) => (
                <Checkbox
                  key={db.id}
                  label={db.display_name}
                  description={db.description}
                  checked={userDatabases.includes(db.id!)}
                  onChange={(e) => {
                    if (e.currentTarget.checked) {
                      setUserDatabases([...userDatabases, db.id!]);
                    } else {
                      setUserDatabases(userDatabases.filter((id) => id !== db.id));
                    }
                  }}
                />
              ))}

              <Group justify="flex-end">
                <Button variant="default" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveAccess}>Save Changes</Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
