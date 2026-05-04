import React, { Dispatch, SetStateAction } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import type { CustomField } from '@core/types';
import type { LocalAttachment } from '@features/pqr/hooks/useCreatePQR';
import { styles } from './createPQRStyles';

interface Props {
  visibleFields: CustomField[];
  requireEvidence: boolean;
  customFieldValues: Record<string, string>;
  setCustomFieldValues: Dispatch<SetStateAction<Record<string, string>>>;
  attachments: LocalAttachment[];
  onPickImage: () => void;
  onPickDocument: () => void;
  onRemoveAttachment: (index: number) => void;
}

export function Attachments({
  visibleFields,
  requireEvidence,
  customFieldValues,
  setCustomFieldValues,
  attachments,
  onPickImage,
  onPickDocument,
  onRemoveAttachment,
}: Props) {
  return (
    <View testID="step3-content">
      <Text style={styles.stepTitle}>Paso 3 — Información adicional</Text>

      {/* Campos personalizados */}
      {visibleFields.length > 0 && (
        <View style={styles.fieldContainer}>
          <Text style={styles.sectionLabel}>Campos requeridos por la entidad</Text>
          {visibleFields.map((field) => (
            <View key={field.id} style={styles.fieldContainer}>
              <Text style={styles.label}>
                {field.name}
                {field.required ? ' *' : ''}
              </Text>
              <TextInput
                testID={`custom-field-${field.name}`}
                style={styles.input}
                placeholder={field.placeholder ?? field.name}
                placeholderTextColor="#9CA3AF"
                value={customFieldValues[field.name] ?? ''}
                onChangeText={(text) =>
                  setCustomFieldValues((prev) => ({ ...prev, [field.name]: text }))
                }
                keyboardType={field.type === 'number' ? 'numeric' : 'default'}
              />
            </View>
          ))}
        </View>
      )}

      {/* Adjuntos */}
      <View style={styles.fieldContainer}>
        <Text style={styles.sectionLabel}>
          Adjuntos
          {requireEvidence ? ' (mínimo 1 requerido)' : ' (opcional)'}
        </Text>

        <View style={styles.attachmentButtons}>
          <TouchableOpacity
            testID="add-image-btn"
            style={styles.attachmentBtn}
            onPress={onPickImage}
          >
            <Text style={styles.attachmentBtnText}>+ Imagen / Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="add-doc-btn"
            style={styles.attachmentBtn}
            onPress={onPickDocument}
          >
            <Text style={styles.attachmentBtnText}>+ Documento</Text>
          </TouchableOpacity>
        </View>

        {attachments.map((file, index) => (
          <View key={file.uri} style={styles.attachmentItem}>
            <Text style={styles.attachmentName} numberOfLines={1}>
              {file.name}
            </Text>
            <TouchableOpacity
              testID={`remove-attachment-${index}`}
              onPress={() => onRemoveAttachment(index)}
            >
              <Text style={styles.removeText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}
