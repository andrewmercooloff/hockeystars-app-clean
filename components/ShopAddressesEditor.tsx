import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { joinShopAddresses, parseShopAddresses } from './ShopLocationMap';

type Props = {
  value: string;
  onChange: (joined: string) => void;
  onFocus?: () => void;
  addressLabel?: string;
  addLabel?: string;
  placeholder?: string;
};

export default function ShopAddressesEditor({
  value,
  onChange,
  onFocus,
  addressLabel = 'Адрес',
  addLabel = 'Добавить адрес',
  placeholder = 'Улица, дом',
}: Props) {
  const lines = parseShopAddresses(value);
  const list = lines.length > 0 ? lines : [''];

  const updateAt = (index: number, text: string) => {
    const next = [...list];
    next[index] = text;
    onChange(joinShopAddresses(next));
  };

  const removeAt = (index: number) => {
    const next = list.filter((_, i) => i !== index);
    onChange(joinShopAddresses(next.length ? next : ['']));
  };

  const addLine = () => {
    onChange(joinShopAddresses([...list, '']));
  };

  return (
    <View style={styles.wrap}>
      {list.map((line, index) => (
        <View key={`addr-${index}`} style={styles.row}>
          <TextInput
            style={styles.input}
            value={line}
            onFocus={onFocus}
            onChangeText={(text) => updateAt(index, text)}
            placeholder={`${addressLabel} ${index + 1}`}
            placeholderTextColor="#888"
          />
          {list.length > 1 ? (
            <TouchableOpacity onPress={() => removeAt(index)} style={styles.removeBtn} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color="#888" />
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
      <TouchableOpacity onPress={addLine} style={styles.addBtn} activeOpacity={0.7}>
        <Ionicons name="add-circle-outline" size={18} color="#fa2f40" />
        <Text style={styles.addText}>{addLabel}</Text>
      </TouchableOpacity>
      {placeholder ? <Text style={styles.hint}>{placeholder}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontFamily: 'Gilroy-Regular',
    fontSize: 15,
  },
  removeBtn: {
    padding: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  addText: {
    color: '#fa2f40',
    fontFamily: 'Gilroy-Bold',
    fontSize: 14,
  },
  hint: {
    color: '#777',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
  },
});
