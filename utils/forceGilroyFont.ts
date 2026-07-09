import { Text, TextInput, Platform } from 'react-native';

let isGilroyForced = false;

/**
 * Принудительно применяет шрифт Gilroy ко всем Text и TextInput компонентам
 * Особенно важно для Android, где глобальное переопределение может не работать
 */
export function forceGilroyFont() {
  if (isGilroyForced) return;
  
  
  // Патчим внутренний render (нет в публичных типах RN, поэтому any)
  const PatchableText = Text as any;
  const PatchableTextInput = TextInput as any;

  // Сохраняем оригинальные render функции
  const OriginalTextRender = PatchableText.render;
  const OriginalTextInputRender = PatchableTextInput.render;

  if (!OriginalTextRender || !OriginalTextInputRender) {
    // В новых версиях RN у компонентов нет статического render — патч не применим
    isGilroyForced = true;
    return;
  }

  // Переопределяем Text.render
  PatchableText.render = function (props: any, ref: any) {
    // Всегда применяем Gilroy-Regular как базовый шрифт
    const newProps = {
      ...props,
      style: [
        { fontFamily: 'Gilroy-Regular' },
        props.style,
      ],
    };
    
    return OriginalTextRender.call(this, newProps, ref);
  };
  
  // Переопределяем TextInput.render
  PatchableTextInput.render = function (props: any, ref: any) {
    // Всегда применяем Gilroy-Regular как базовый шрифт
    const newProps = {
      ...props,
      style: [
        { fontFamily: 'Gilroy-Regular' },
        props.style,
      ],
    };
    
    return OriginalTextInputRender.call(this, newProps, ref);
  };
  
  isGilroyForced = true;
}

/**
 * Сброс принудительного применения шрифта (для тестирования)
 */
export function resetGilroyFont() {
  isGilroyForced = false;
}











