import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { TextInput, Platform, TextInputProps } from 'react-native';

interface WebTextInputProps extends TextInputProps {
  style?: any;
}

function flattenStyle(style: any): Record<string, any> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce((acc, item) => ({ ...acc, ...flattenStyle(item) }), {});
  }
  if (typeof style === 'object') return { ...style };
  return {};
}

const WebTextInput = forwardRef<TextInput, WebTextInputProps>((props, ref) => {
  const inputRef = useRef<TextInput>(null);

  useImperativeHandle(ref, () => inputRef.current as TextInput);

  if (Platform.OS === 'web') {
    const flat = flattenStyle(props.style);
    const {
      // RN-only / conflicting keys — keep layout via dedicated web styles
      borderWidth: _bw,
      borderColor: _bc,
      backgroundColor: bg,
      borderRadius: radius,
      padding: pad,
      paddingHorizontal,
      paddingVertical,
      fontSize,
      fontFamily,
      color,
      textAlign,
      letterSpacing,
      minWidth,
      maxWidth,
      width,
      flex,
      ...restFlat
    } = flat;

    return (
      <input
        ref={inputRef as any}
        style={{
          ...restFlat,
          boxSizing: 'border-box',
          outline: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          appearance: 'none',
          display: 'block',
          width: width ?? '100%',
          maxWidth: maxWidth ?? '100%',
          minWidth: minWidth ?? 0,
          flex: flex,
          margin: 0,
          overflow: 'hidden',
          padding:
            pad ??
            (paddingVertical != null || paddingHorizontal != null
              ? `${paddingVertical ?? 15}px ${paddingHorizontal ?? 15}px`
              : 15),
          borderRadius: radius ?? 10,
          backgroundColor: bg ?? 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          color: color ?? '#fff',
          fontSize: fontSize ?? 16,
          fontFamily: fontFamily ?? 'Gilroy-Regular',
          textAlign: textAlign,
          letterSpacing: letterSpacing ?? 0,
        }}
        size={1}
        value={props.value}
        onChange={(e) => props.onChangeText?.(e.target.value)}
        placeholder={props.placeholder}
        autoComplete={props.autoComplete as any}
        type={props.keyboardType === 'phone-pad' ? 'tel' : props.keyboardType === 'number-pad' ? 'tel' : 'text'}
        inputMode={props.keyboardType === 'number-pad' || props.keyboardType === 'phone-pad' ? 'numeric' : undefined}
        pattern={props.keyboardType === 'number-pad' ? '[0-9]*' : undefined}
        maxLength={props.maxLength}
        disabled={!props.editable}
        onFocus={props.onFocus as any}
        onBlur={props.onBlur as any}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && props.onSubmitEditing) {
            props.onSubmitEditing({} as any);
          }
        }}
      />
    );
  }

  return <TextInput ref={inputRef} {...props} />;
});

WebTextInput.displayName = 'WebTextInput';

export default WebTextInput;
