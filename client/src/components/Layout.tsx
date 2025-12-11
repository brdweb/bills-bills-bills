import {
  AppShell,
  Group,
  Title,
  Button,
  Select,
  ActionIcon,
  useMantineColorScheme,
  Text,
  Burger,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSun, IconMoon, IconSettings, IconLogout, IconCash } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  onLoginClick: () => void;
  onAdminClick: () => void;
}

export function Layout({ children, sidebar, onLoginClick, onAdminClick }: LayoutProps) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [opened, { toggle }] = useDisclosure();
  const { isLoggedIn, isAdmin, databases, currentDb, selectDatabase, logout } = useAuth();

  const handleDatabaseChange = (value: string | null) => {
    if (value) {
      selectDatabase(value);
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <IconCash size={32} color="var(--mantine-color-violet-6)" />
            <Title order={3} c="violet">Bills, Bills, Bills!</Title>
          </Group>

          <Group>
            {isLoggedIn && databases.length > 0 && (
              <Select
                placeholder="Select database"
                data={databases.map((db) => ({
                  value: db.name,
                  label: db.display_name,
                }))}
                value={currentDb}
                onChange={handleDatabaseChange}
                size="sm"
                w={180}
              />
            )}

            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => toggleColorScheme()}
              aria-label="Toggle color scheme"
            >
              {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
            </ActionIcon>

            {isLoggedIn ? (
              <Group gap="xs">
                {isAdmin && (
                  <Button
                    variant="light"
                    color="orange"
                    size="sm"
                    leftSection={<IconSettings size={16} />}
                    onClick={onAdminClick}
                  >
                    Admin
                  </Button>
                )}
                <Button
                  variant="subtle"
                  color="gray"
                  size="sm"
                  leftSection={<IconLogout size={16} />}
                  onClick={logout}
                >
                  Logout
                </Button>
              </Group>
            ) : (
              <Button variant="filled" size="sm" onClick={onLoginClick}>
                Login
              </Button>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        {sidebar}
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
