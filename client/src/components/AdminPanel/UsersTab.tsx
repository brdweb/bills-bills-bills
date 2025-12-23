import { useState, useEffect } from 'react';
import {
  Stack,
  Table,
  Button,
  ActionIcon,
  Group,
  TextInput,
  Select,
  Modal,
  Checkbox,
  Text,
  Badge,
  Paper,
  Loader,
  Center,
  Divider,
} from '@mantine/core';
import { IconTrash, IconEdit, IconMail, IconX } from '@tabler/icons-react';
import type { User, Database, UserInvite } from '../../api/client';
import {
  getUsers,
  deleteUser,
  updateUser,
  getDatabases,
  getUserDatabases,
  grantDatabaseAccess,
  revokeDatabaseAccess,
  inviteUser,
  getInvites,
  cancelInvite,
} from '../../api/client';

export function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite user form
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('user');
  const [selectedDatabases, setSelectedDatabases] = useState<number[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Edit user modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userDatabases, setUserDatabases] = useState<number[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [accessLoading, setAccessLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, dbsRes, invitesRes] = await Promise.all([
        getUsers(),
        getDatabases(),
        getInvites(),
      ]);
      setUsers(usersRes.data);
      setDatabases(dbsRes.data);
      setInvites(invitesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail) return;

    setInviteLoading(true);
    try {
      await inviteUser(inviteEmail, inviteRole, selectedDatabases);
      await fetchData();
      setShowInviteForm(false);
      setInviteEmail('');
      setInviteRole('user');
      setSelectedDatabases([]);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCancelInvite = async (inviteId: number) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;

    try {
      await cancelInvite(inviteId);
      await fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to cancel invitation');
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

  const handleEditUser = async (user: User) => {
    setEditingUser(user);
    setUserEmail(user.email || '');
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

  const handleSaveUser = async () => {
    if (!editingUser) return;

    setAccessLoading(true);
    try {
      // Update email if changed
      const newEmail = userEmail.trim() || null;
      if (newEmail !== (editingUser.email || null)) {
        await updateUser(editingUser.id, { email: newEmail });
      }

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

      await fetchData();
      setEditingUser(null);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update user');
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
      {/* Users Table */}
      <Text fw={600} size="sm">Users</Text>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Username</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Role</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {users.map((user) => (
            <Table.Tr key={user.id}>
              <Table.Td>{user.username}</Table.Td>
              <Table.Td>
                <Text size="sm" c={user.email ? undefined : 'dimmed'}>
                  {user.email || '—'}
                </Text>
              </Table.Td>
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
                    onClick={() => handleEditUser(user)}
                    title="Edit User"
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

      {/* Pending Invitations */}
      {invites.length > 0 && (
        <>
          <Divider my="sm" />
          <Text fw={600} size="sm">Pending Invitations</Text>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Email</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Expires</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {invites.map((invite) => (
                <Table.Tr key={invite.id}>
                  <Table.Td>{invite.email}</Table.Td>
                  <Table.Td>
                    <Badge color={invite.role === 'admin' ? 'orange' : 'blue'}>
                      {invite.role}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => handleCancelInvite(invite.id)}
                      title="Cancel Invitation"
                    >
                      <IconX size={18} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}

      <Divider my="sm" />

      {/* Invite User Form */}
      {!showInviteForm ? (
        <Button
          leftSection={<IconMail size={16} />}
          variant="light"
          onClick={() => setShowInviteForm(true)}
        >
          Invite User
        </Button>
      ) : (
        <Paper p="md" withBorder>
          <Stack gap="sm">
            <Text fw={500}>Invite New User</Text>
            <Text size="sm" c="dimmed">
              Send an invitation email. The user will set their own username and password.
            </Text>
            <Group grow>
              <TextInput
                label="Email Address"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.currentTarget.value)}
                placeholder="user@example.com"
              />
              <Select
                label="Role"
                value={inviteRole}
                onChange={(val) => setInviteRole(val || 'user')}
                data={[
                  { value: 'user', label: 'User' },
                  { value: 'admin', label: 'Admin' },
                ]}
              />
            </Group>

            <Text size="sm" fw={500}>
              Bill Group Access
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
              <Button
                onClick={handleInviteUser}
                loading={inviteLoading}
                leftSection={<IconMail size={16} />}
              >
                Send Invitation
              </Button>
              <Button variant="default" onClick={() => setShowInviteForm(false)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      {/* Edit User Modal */}
      <Modal
        opened={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Edit User: ${editingUser?.username}`}
        centered
      >
        <Stack gap="md">
          {accessLoading ? (
            <Center py="md">
              <Loader />
            </Center>
          ) : (
            <>
              <TextInput
                label="Email"
                placeholder="user@example.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.currentTarget.value)}
              />

              <Text size="sm" fw={500}>
                Bill Group Access
              </Text>
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
                <Button onClick={handleSaveUser}>Save Changes</Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
