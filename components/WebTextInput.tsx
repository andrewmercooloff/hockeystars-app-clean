import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { TextInput, Platform, TextInputProps } from 'react-native';

interface WebTextInputProps extends TextInputProps {
  style?: any;
}

const WebTextInput = forwardRef<TextInput, WebTextInputProps>((props, ref) => {
  const inputRef = useRef<TextInput>(null);

  useImperativeHandle(ref, () => inputRef.current as TextInput);

  if (Platform.OS === 'web') {
    return (
      <input
        ref={inputRef as any}
        style={{
          ...props.style,
          outline: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          appearance: 'none',
          border: 'none',
          background: 'transparent',
          color: '#fff',
          fontSize: 16,
          fontFamily: 'Gilroy-Regular',
          width: '100%',
          padding: 15,
          borderRadius: 10,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          borderColor: 'rgba(255, 68, 68, 0.3)',
          borderStyle: 'solid',
        }}
        value={props.value}
        onChange={(e) => props.onChangeText?.(e.target.value)}
        placeholder={props.placeholder}
        placeholderStyle={{ color: '#888' }}
        autoComplete={props.autoComplete}
        type={props.keyboardType === 'phone-pad' ? 'tel' : props.keyboardType === 'number-pad' ? 'number' : 'text'}
        maxLength={props.maxLength}
        disabled={!props.editable}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && props.onSubmitEditing) {
            props.onSubmitEditing();
          }
        }}
      />
    );
  }

  return <TextInput ref={inputRef} {...props} />;
});

WebTextInput.displayName = 'WebTextInput';

export default WebTextInput;
