import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button } from '@prime/ui';

import { AuthField, AuthScreen, GENERIC_CODE_ERROR } from '@/components/auth/AuthLayout';
import {
  commitAuthenticatedSession,
  fetchMyRole,
  setInteractiveLogin,
  signOut,
} from '@/hooks/useAuth';
import { getSupabase } from '@/services/supabase';
import { useTouchFullLoginMutation } from '@/store/api/endpoints';
import { useAppDispatch } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AuthStackParamList } from '@/types/navigation';

type Mode = 'loading' | 'enroll' | 'challenge' | 'error';

export function AdminMfaScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const dispatch = useAppDispatch();
  const [touchFullLogin] = useTouchFullLoginMutation();
  const [mode, setMode] = useState<Mode>('loading');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [otpUri, setOtpUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = getSupabase();
      try {
        const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors();
        if (listErr) throw listErr;
        const verified = factors?.totp?.find((f) => f.status === 'verified');
        if (verified) {
          if (!active) return;
          setFactorId(verified.id);
          setMode('challenge');
          return;
        }
        // No verified factor: clean up any stale unverified ones, then enroll.
        for (const f of factors?.totp ?? []) {
          await supabase.auth.mfa.unenroll({ factorId: f.id }).catch(() => undefined);
        }
        const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: `Authenticator ${new Date().toISOString()}`,
        });
        if (enrollErr) throw enrollErr;
        if (!active) return;
        setFactorId(data.id);
        setOtpUri(data.totp.uri);
        setSecret(data.totp.secret);
        setMode('enroll');
      } catch {
        if (active) setMode('error');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onVerify = async () => {
    if (!factorId || code.length < 6) return;
    setVerifying(true);
    setError(null);
    const supabase = getSupabase();
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      const result = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });
      if (result.error) throw result.error;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Session missing');
      const role = await fetchMyRole();
      if (role !== 'admin') throw new Error('Role mismatch');
      // Stamp the login so the admin-session window starts now (drives both the
      // cold-start restore and the live expiry timer).
      await touchFullLogin().unwrap().catch(() => undefined);
      commitAuthenticatedSession(dispatch, session, session.user, 'admin');
    } catch {
      setError(GENERIC_CODE_ERROR);
    } finally {
      setVerifying(false);
    }
  };

  const onCancel = async () => {
    setInteractiveLogin(false);
    await signOut(dispatch);
    navigation.navigate('Landing');
  };

  if (mode === 'loading') {
    return (
      <AuthScreen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryNavy} />
        </View>
      </AuthScreen>
    );
  }

  if (mode === 'error') {
    return (
      <AuthScreen>
        <Text style={styles.title}>Two-factor authentication</Text>
        <Text style={styles.subtitle}>Something went wrong setting up your second factor.</Text>
        <Button label="Back to sign in" onPress={onCancel} style={styles.btn} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <Text style={styles.title}>Two-factor authentication</Text>
      {mode === 'enroll' ? (
        <>
          <Text style={styles.subtitle}>
            Scan this QR code in Google or Microsoft Authenticator, then enter the code.
          </Text>
          {otpUri ? (
            <View style={styles.qrWrap}>
              <QRCode value={otpUri} size={200} />
            </View>
          ) : null}
          {secret ? (
            <Text selectable style={styles.secret}>
              {secret}
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={styles.subtitle}>Enter the 6-digit code from your authenticator app.</Text>
      )}
      <AuthField
        label="Authentication code"
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
        style={styles.codeInput}
        error={error}
      />
      <Button
        label={verifying ? 'Verifying…' : 'Verify'}
        onPress={onVerify}
        disabled={verifying || code.length < 6}
        style={styles.btn}
      />
      <Button label="Cancel" variant="secondary" onPress={onCancel} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.md },
  qrWrap: { alignItems: 'center', paddingVertical: spacing.md },
  secret: {
    fontSize: 16,
    letterSpacing: 2,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.sm,
    borderRadius: 8,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  codeInput: { letterSpacing: 8, textAlign: 'center', fontSize: 22 },
  btn: { marginTop: spacing.md, marginBottom: spacing.sm },
});
