import React from 'react';
import {
  Modal as RNModal,
  ModalProps as RNModalProps,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface ModalProps extends Omit<RNModalProps, 'visible'> {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  closeOnOverlayClick?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  ...props
}: ModalProps) {
  return (
    <RNModal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      {...props}
    >
      <TouchableWithoutFeedback onPress={closeOnOverlayClick ? onClose : undefined}>
        <View className="flex-1 bg-black/70 justify-end">
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              {children}
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

export function ModalContent({ className = '', children, ...props }: any) {
  return (
    <View className={`bg-surface rounded-t-3xl p-6 pb-10 ${className}`} {...props}>
      {children}
    </View>
  );
}

export function ModalHeader({ className = '', children, ...props }: any) {
  return (
    <View className={`mb-4 ${className}`} {...props}>
      {children}
    </View>
  );
}

export function ModalBody({ className = '', children, ...props }: any) {
  return (
    <View className={`mb-6 ${className}`} {...props}>
      {children}
    </View>
  );
}

export function ModalFooter({ className = '', children, ...props }: any) {
  return (
    <View className={`flex-row gap-3 ${className}`} {...props}>
      {children}
    </View>
  );
}

export function ModalCloseButton({ onClose, className = '' }: { onClose: () => void; className?: string }) {
  return (
    <TouchableOpacity
      className={`absolute top-4 right-4 w-8 h-8 rounded-full bg-border items-center justify-center ${className}`}
      onPress={onClose}
    >
      <Text className="text-white text-lg">✕</Text>
    </TouchableOpacity>
  );
}
