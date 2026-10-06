import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '../../src/utils/responsive';
import { useAuthStore } from '../../src/store/authStore';
import { ApiClient } from '../../src/services/api/apiClient';

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Name, Email, and Password.');
      return;
    }

    setLoading(true);
    try {
      const res = await ApiClient.getInstance().post('/api/auth/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        language: 'en'
      });

      if (res.success && res.token && res.user) {
        setAuth(res.user, res.token);
        router.replace('/(main)/map');
      } else {
        Alert.alert('Registration Failed', res.error || 'Unable to register account.');
      }
    } catch (err: any) {
      if (err.message?.includes('Network request failed') || err.message?.includes('Failed to fetch')) {
        Alert.alert(
          'Backend Unreachable',
          'Registered in Local Offline Mode with session token.',
          [
            {
              text: 'Continue Offline',
              onPress: () => {
                setAuth(
                  {
                    id: Date.now(),
                    name: name.trim(),
                    email: email.trim(),
                    language: 'en',
                    status: 'active'
                  },
                  `local_jwt_${Date.now()}`
                );
                router.replace('/(main)/map');
              }
            }
          ]
        );
      } else {
        Alert.alert('Registration Error', err.message || 'Unable to register.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.responsiveWrapper}>
        <View style={styles.card}>
          <Text style={styles.title}>📍 Register Teammate</Text>
          <Text style={styles.subtitle}>Join Field Tracking Network</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Field User"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="user@domain.com"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={Colors.textMuted}
          />

          <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.btnText}>Register & Continue ➔</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginLinkText}>Already have an account? Sign In ➔</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: Spacing.md
  },
  responsiveWrapper: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center'
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.lg
  },
  title: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'OpenSans_700Bold',
    textAlign: 'center'
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    marginTop: 4,
    fontFamily: 'OpenSans_400Regular'
  },
  label: {
    color: Colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'OpenSans_600SemiBold'
  },
  input: {
    backgroundColor: '#F4F5F7',
    color: Colors.textPrimary,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
    fontFamily: 'OpenSans_400Regular'
  },
  btn: {
    backgroundColor: Colors.primaryDark,
    paddingVertical: Spacing.sm + 4,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.sm
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: 'OpenSans_700Bold'
  },
  loginLink: {
    marginTop: Spacing.md,
    alignItems: 'center'
  },
  loginLinkText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'OpenSans_600SemiBold'
  }
});
