import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@prime/ui';
import { RequestTypeSchema, type RequestType } from '@prime/types';
import { z } from 'zod';

import { useCamera } from '@/hooks/useCamera';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import type { Attachment } from '../hooks/useRequests';

const createRequestSchema = z.object({
  requestType: RequestTypeSchema,
  address: z.string().min(5, 'Enter a valid address'),
  description: z.string().max(500, 'Max 500 characters').optional(),
});

export type CreateRequestFormValues = z.infer<typeof createRequestSchema>;

type CreateRequestFormProps = {
  attachments: Attachment[];
  selectedRequestType?: RequestType;
  onAddAttachment: (uri: string, name: string, size: number) => void;
  onRemoveAttachment: (id: string) => void;
  onSubmit: (values: CreateRequestFormValues) => Promise<void>;
  onOpenTypeSheet: () => void;
  submitting?: boolean;
};

export function CreateRequestForm({
  attachments,
  selectedRequestType,
  onAddAttachment,
  onRemoveAttachment,
  onSubmit,
  onOpenTypeSheet,
  submitting,
}: CreateRequestFormProps) {
  const { pickFromGallery, takePhoto } = useCamera();
  const { control, handleSubmit, watch, setValue } = useForm<CreateRequestFormValues>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: { requestType: selectedRequestType ?? 'repair', address: '', description: '' },
  });

  useEffect(() => {
    if (selectedRequestType) setValue('requestType', selectedRequestType);
  }, [selectedRequestType, setValue]);

  const requestType = watch('requestType');

  const handleGallery = useCallback(async () => {
    try {
      const uri = await pickFromGallery();
      onAddAttachment(uri, 'photo.jpg', 0);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not add photo';
      if (message !== 'No image selected') {
        Alert.alert('Attachment error', message);
      }
    }
  }, [onAddAttachment, pickFromGallery]);

  const handleCamera = useCallback(async () => {
    try {
      const uri = await takePhoto();
      onAddAttachment(uri, 'photo.jpg', 0);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not add photo';
      if (message !== 'Photo capture cancelled') {
        Alert.alert('Attachment error', message);
      }
    }
  }, [onAddAttachment, takePhoto]);

  return (
    <View style={styles.form}>
      <Pressable style={styles.typePicker} onPress={onOpenTypeSheet}>
        <Text style={styles.label}>Request type</Text>
        <Text style={styles.typeValue}>{requestType}</Text>
      </Pressable>

      <Controller
        control={control}
        name="address"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <View>
            <TextInput
              style={styles.input}
              placeholder="Service address"
              placeholderTextColor={colors.textSecondary}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
            {error ? <Text style={styles.error}>{error.message}</Text> : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <View>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={500}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
            {error ? <Text style={styles.error}>{error.message}</Text> : null}
          </View>
        )}
      />

      <View style={styles.attachments}>
        <Text style={styles.label}>Photos ({attachments.length}/3)</Text>
        <View style={styles.photoButtons}>
          <Button label="Gallery" variant="secondary" onPress={handleGallery} />
          <Button label="Camera" variant="secondary" onPress={handleCamera} />
        </View>
        <View style={styles.thumbs}>
          {attachments.map((file) => (
            <Pressable key={file.id} onPress={() => onRemoveAttachment(file.id)}>
              <Image source={{ uri: file.uri }} style={styles.thumb} />
            </Pressable>
          ))}
        </View>
      </View>

      <Button
        label={submitting ? 'Submitting…' : 'Submit request'}
        onPress={handleSubmit(onSubmit)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing.md, gap: spacing.sm },
  typePicker: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceWhite,
  },
  label: { color: colors.textSecondary, fontSize: 12, marginBottom: spacing.xxs },
  typeValue: { textTransform: 'capitalize', fontWeight: '600', color: colors.textPrimary },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceWhite,
    color: colors.textPrimary,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  error: { color: colors.errorRed, fontSize: 12, marginTop: spacing.xxs },
  attachments: { gap: spacing.xs },
  photoButtons: { flexDirection: 'row', gap: spacing.xs },
  thumbs: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  thumb: { width: 64, height: 64, borderRadius: radius.sm },
});
