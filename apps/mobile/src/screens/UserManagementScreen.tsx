import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AdminUser } from '../types';

type Props = NativeStackScreenProps<any, 'UserManagement'>;

export default function UserManagementScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.getUsers();
      if (response.success && response.data) {
        setUsers(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to load users');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [fetchUsers])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleRole = (targetUser: AdminUser) => {
    if (targetUser.id === user?.id) {
      Alert.alert('Error', 'You cannot change your own role');
      return;
    }

    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    Alert.alert(
      'Change Role',
      `Change ${targetUser.username}'s role from ${targetUser.role} to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            const result = await api.updateUserRole(targetUser.id, newRole);
            if (result.success) {
              fetchUsers();
            } else {
              Alert.alert('Error', result.error || 'Failed to update role');
            }
          },
        },
      ]
    );
  };

  const handleDeleteUser = (targetUser: AdminUser) => {
    if (targetUser.id === user?.id) {
      Alert.alert('Error', 'You cannot delete your own account');
      return;
    }

    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${targetUser.username}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await api.deleteUser(targetUser.id);
            if (result.success) {
              fetchUsers();
              Alert.alert('Success', 'User deleted');
            } else {
              Alert.alert('Error', result.error || 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderUser = ({ item }: { item: AdminUser }) => {
    const isCurrentUser = item.id === user?.id;

    return (
      <View style={[styles.userCard, { backgroundColor: colors.surface }]}>
        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <Text style={[styles.username, { color: colors.text }]}>
              {item.username}
              {isCurrentUser && <Text style={{ color: colors.textMuted }}> (you)</Text>}
            </Text>
            <View style={[
              styles.roleBadge,
              { backgroundColor: item.role === 'admin' ? colors.primary : colors.border }
            ]}>
              <Text style={[
                styles.roleText,
                { color: item.role === 'admin' ? '#fff' : colors.text }
              ]}>
                {item.role}
              </Text>
            </View>
          </View>
          {item.email && (
            <Text style={[styles.email, { color: colors.textMuted }]}>{item.email}</Text>
          )}
          <Text style={[styles.date, { color: colors.textMuted }]}>
            Joined {formatDate(item.created_at)}
          </Text>
        </View>

        {!isCurrentUser && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.border }]}
              onPress={() => handleToggleRole(item)}
            >
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                Make {item.role === 'admin' ? 'User' : 'Admin'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.danger }]}
              onPress={() => handleDeleteUser(item)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>User Management</Text>
        <View style={styles.placeholder} />
      </View>

      {error ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchUsers}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No users found</Text>
            </View>
          }
          ListHeaderComponent={
            <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
              {users.length} user{users.length !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 14,
    marginBottom: 12,
  },
  userCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userInfo: {
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  email: {
    fontSize: 14,
    marginTop: 4,
  },
  date: {
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
  },
});
