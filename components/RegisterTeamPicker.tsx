import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { searchTeams, Team } from '../utils/playerStorage';

export interface RegisterTeamValue {
  /** Existing team from DB, or null when the user typed a new name */
  team: Team | null;
  name: string;
}

interface Props {
  value: RegisterTeamValue;
  onChange: (v: RegisterTeamValue) => void;
  label: string;
  hint?: string;
}

/**
 * Single-team picker for the sign-up flow: search existing teams with autocomplete,
 * or keep the typed name so a new team is created on registration.
 */
export default function RegisterTeamPicker({ value, onChange, label, hint }: Props) {
  const { t, language } = useLanguage();
  const [results, setResults] = useState<Team[]>([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (value.team || value.name.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchTeams(value.name.trim(), language);
        if (!cancelled) setResults(found.slice(0, 6));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [value.name, value.team, language]);

  const showList = focused && !value.team && (results.length > 0 || searching);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, value.team && styles.inputWrapSelected]}>
        <Ionicons name={value.team ? 'checkmark-circle' : 'shield-outline'} size={18} color={value.team ? '#4cd964' : 'rgba(255,255,255,0.5)'} />
        <TextInput
          style={styles.input}
          value={value.name}
          onChangeText={(text) => onChange({ team: null, name: text })}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={t('register.teamPlaceholder')}
          placeholderTextColor="#888"
          autoCapitalize="words"
          autoCorrect={false}
        />
        {value.name.length > 0 && (
          <TouchableOpacity onPress={() => onChange({ team: null, name: '' })} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        )}
      </View>

      {showList && (
        <View style={styles.list}>
          {searching && results.length === 0 ? (
            <ActivityIndicator color="#fa2f40" style={{ padding: 12 }} />
          ) : (
            results.map((team) => (
              <TouchableOpacity
                key={team.id}
                style={styles.row}
                onPress={() => onChange({ team, name: team.name })}
              >
                <Text style={styles.rowName} numberOfLines={1}>{team.name}</Text>
                {(team.city || team.country) && (
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {[team.city, team.country].filter(Boolean).join(', ')}
                  </Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {!value.team && value.name.trim().length >= 2 && !searching && results.length === 0 && !showList ? (
        <Text style={styles.hint}>{t('register.teamWillBeCreated')}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: { color: '#fff', fontSize: 15, fontFamily: 'Gilroy-Bold', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  inputWrapSelected: { borderColor: 'rgba(76,217,100,0.5)' },
  input: { flex: 1, paddingVertical: 15, fontSize: 16, fontFamily: 'Gilroy-Regular', color: '#fff' },
  list: {
    marginTop: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(20,19,26,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  row: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  rowName: { color: '#fff', fontSize: 15, fontFamily: 'Gilroy-Bold' },
  rowMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'Gilroy-Regular', marginTop: 2 },
  hint: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: 'Gilroy-Regular', marginTop: 6, lineHeight: 16 },
});
