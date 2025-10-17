import { Text, TextInput, Platform } from 'react-native';

let isGilroyForced = false;

/**
 * Принудительно применяет шрифт Gilroy ко всем Text и TextInput компонентам
 * Особенно важно для Android, где глобальное переопределение может не работать
 */
export function forceGilroyFont() {
  if (isGilroyForced) return;
  
  console.log('🔤 Принудительное применение шрифта Gilroy...');
  
  // Сохраняем оригинальные render функции
  const OriginalTextRender = Text.render;
  const OriginalTextInputRender = TextInput.render;
  
  // Переопределяем Text.render
  Text.render = function (props: any, ref: any) {
    const newProps = {
      ...props,
      style: [
        { fontFamily: 'Gilroy-Regular' },
        props.style,
      ],
    };
    
    // Если в стилях уже есть Gilroy-Bold, сохраняем его
    if (props.style) {
      const flatStyle = Array.isArray(props.style) 
        ? Object.assign({}, ...props.style.filter(Boolean))
        : props.style;
      
      if (flatStyle?.fontFamily?.includes('Gilroy')) {
        newProps.style = props.style;
      }
    }
    
    return OriginalTextRender.call(this, newProps, ref);
  };
  
  // Переопределяем TextInput.render
  TextInput.render = function (props: any, ref: any) {
    const newProps = {
      ...props,
      style: [
        { fontFamily: 'Gilroy-Regular' },
        props.style,
      ],
    };
    
    // Если в стилях уже есть Gilroy, сохраняем его
    if (props.style) {
      const flatStyle = Array.isArray(props.style) 
        ? Object.assign({}, ...props.style.filter(Boolean))
        : props.style;
      
      if (flatStyle?.fontFamily?.includes('Gilroy')) {
        newProps.style = props.style;
      }
    }
    
    return OriginalTextInputRender.call(this, newProps, ref);
  };
  
  isGilroyForced = true;
  console.log('✅ Шрифт Gilroy принудительно применен ко всем компонентам');
}

/**
 * Сброс принудительного применения шрифта (для тестирования)
 */
export function resetGilroyFont() {
  isGilroyForced = false;
}











