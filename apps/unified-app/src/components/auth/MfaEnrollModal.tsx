import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { FullScreenModalShell } from '@/components/common';
import { getSupabase } from '@/services/supabase';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type MfaEnrollModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Called after a factor is enrolled AND verified (session upgraded to aal2). */
  onEnrolled?: () => void;
};

/**
 * Native Supabase TOTP enrollment: enroll -> show QR/secret -> challenge+verify.
 * If the user backs out before verifying, the unverified factor is unenrolled
 * so we never leave orphaned pending factors on the account.
 */
export function MfaEnrollModal({ visible, onClose, onEnrolled }: MfaEnrollModalProps) {
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [otpUri, setOtpUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    verifiedRef.current = false;
    setCode('');
    setError(null);
    setFactorId(null);
    setOtpUri(null);
    setSecret(null);
    setLoading(true);
    void (async () => {
      try {
        const { data, error: enrollError } = await getSupabase().auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: `Authenticator ${new Date().toISOString()}`,
        });
        if (enrollError) throw enrollError;
        if (!active) return;
        setFactorId(data.id);
        setOtpUri(data.totp.uri);
        setSecret(data.totp.secret);
      } catch {
        if (active) setError('Could not start enrollment. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [visible]);

  const cleanupUnverified = useCallback(async () => {
    if (factorId && !verifiedRef.current) {
      await getSupabase().auth.mfa.unenroll({ factorId }).catch(() => undefined);
    }
  }, [factorId]);

  const handleCancel = useCallback(async () => {
    await cleanupUnverified();
    onClose();
  }, [cleanupUnverified, onClose]);

  const handleVerify = useCallback(async () => {
    if (!factorId || code.length < 6) return;
    setVerifying(true);
    setError(null);
    try {
      const challenge = await getSupabase().auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      const result = await getSupabase().auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });
      if (result.error) throw result.error;
      verifiedRef.current = true;
      onEnrolled?.();
      onClose();
    } catch {
      setError('That code did not match. Enter the current 6-digit code from your app.');
    } finally {
      setVerifying(false);
    }
  }, [factorId, code, onEnrolled, onClose]);

  return (
    <FullScreenModalShell
      visible={visible}
      title="Two-factor authentication"
      onRequestClose={handleCancel}
      onCancel={handleCancel}
      onDone={handleVerify}
      doneLabel={verifying ? 'Verifying…' : 'Verify'}
      doneDisabled={loading || verifying || code.length < 6}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primaryNavy} />
          </View>
        ) : (
          <>
            <Text style={styles.step}>1. Scan this QR code with your authenticator app</Text>
            {otpUri ? (
              <View style={styles.qrWrap}>
                <QRCode value={otpUri} size={200} />
              </View>
            ) : null}
            {secret ? (
              <>
                <Text style={styles.step}>Or enter this key manually:</Text>
                <Text selectable style={styles.secret}>
                  {secret}
                </Text>
              </>
            ) : null}
            <Text style={styles.step}>2. Enter the 6-digit code to confirm</Text>
            <TextInput
              style={styles.input}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              editable={!verifying}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </>
        )}
      </ScrollView>
    </FullScreenModalShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  center: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  step: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  qrWrap: { alignItems: 'center', paddingVertical: spacing.md },
  secret: {
    fontSize: 16,
    letterSpacing: 2,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radius.sm,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    letterSpacing: 8,
    textAlign: 'center',
    fontSize: 20,
    backgroundColor: colors.surfaceWhite,
  },
  error: { color: colors.errorRed },
});
