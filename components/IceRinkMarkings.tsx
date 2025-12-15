import React, { memo } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import Svg, { Circle, Line, Rect, G } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface IceRinkMarkingsProps {
  width?: number;
  height?: number;
  opacity?: number;
  topInset?: number;    // Отступ сверху (хедер + фильтры)
  bottomInset?: number; // Отступ снизу (нижняя навигация)
}

/**
 * Компонент для отрисовки разметки хоккейного поля
 * Адаптирован для вертикальной ориентации экрана телефона
 */
const IceRinkMarkings: React.FC<IceRinkMarkingsProps> = memo(({ 
  width = SCREEN_WIDTH, 
  height = SCREEN_HEIGHT,
  opacity = 0.3,
  topInset = 0,
  bottomInset = 0
}) => {
  // Вычисляем реальную видимую область льда
  const visibleTop = topInset;
  const visibleBottom = height - bottomInset;
  const visibleHeight = visibleBottom - visibleTop;
  
  // Центр видимой области (не всего экрана!)
  const centerX = width / 2;
  const centerY = visibleTop + (visibleHeight / 2);
  
  // Размеры элементов (пропорционально ВИДИМОЙ области)
  const centerCircleRadius = Math.min(width, visibleHeight) * 0.10;
  const faceoffCircleRadius = Math.min(width, visibleHeight) * 0.07;
  const goalWidth = width * 0.15;
  const goalDepth = 8;
  const lineWidth = 2;
  const thinLineWidth = 1.5;
  
  // Симметричные позиции относительно центра ВИДИМОЙ области
  const blueLineOffset = visibleHeight * 0.22;      // Расстояние от центра до синих линий
  const goalLineOffset = visibleHeight * 0.42;      // Расстояние от центра до линий ворот
  const faceoffCircleOffset = visibleHeight * 0.32; // Расстояние от центра до кругов вбрасывания
  const neutralFaceoffOffset = visibleHeight * 0.12; // Расстояние от центра до точек в нейтральной зоне
  
  // Позиции линий (симметричные относительно центра видимой области)
  const blueLineTop = centerY - blueLineOffset;
  const blueLineBottom = centerY + blueLineOffset;
  const goalLineTop = centerY - goalLineOffset;
  const goalLineBottom = centerY + goalLineOffset;
  
  // Позиции кругов вбрасывания (симметричные)
  const faceoffOffsetX = width * 0.28;
  const faceoffTopY = centerY - faceoffCircleOffset;
  const faceoffBottomY = centerY + faceoffCircleOffset;
  
  // Позиции точек вбрасывания в нейтральной зоне (симметричные)
  const neutralFaceoffY1 = centerY - neutralFaceoffOffset;
  const neutralFaceoffY2 = centerY + neutralFaceoffOffset;

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      <Svg width={width} height={height}>
        <G opacity={opacity}>
          {/* Центральная красная линия */}
          <Line
            x1={0}
            y1={centerY}
            x2={width}
            y2={centerY}
            stroke="#CC0000"
            strokeWidth={lineWidth}
          />
          
          {/* Центральный круг (синий) */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={centerCircleRadius}
            stroke="#0066CC"
            strokeWidth={thinLineWidth}
            fill="none"
          />
          
          {/* Центральная точка */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={4}
            fill="#0066CC"
          />
          
          {/* Синие линии */}
          <Line
            x1={0}
            y1={blueLineTop}
            x2={width}
            y2={blueLineTop}
            stroke="#0066CC"
            strokeWidth={lineWidth}
          />
          <Line
            x1={0}
            y1={blueLineBottom}
            x2={width}
            y2={blueLineBottom}
            stroke="#0066CC"
            strokeWidth={lineWidth}
          />
          
          {/* Линии ворот (красные) */}
          <Line
            x1={centerX - goalWidth * 1.5}
            y1={goalLineTop}
            x2={centerX + goalWidth * 1.5}
            y2={goalLineTop}
            stroke="#CC0000"
            strokeWidth={thinLineWidth}
          />
          <Line
            x1={centerX - goalWidth * 1.5}
            y1={goalLineBottom}
            x2={centerX + goalWidth * 1.5}
            y2={goalLineBottom}
            stroke="#CC0000"
            strokeWidth={thinLineWidth}
          />
          
          {/* Верхние круги вбрасывания */}
          <Circle
            cx={centerX - faceoffOffsetX}
            cy={faceoffTopY}
            r={faceoffCircleRadius}
            stroke="#CC0000"
            strokeWidth={thinLineWidth}
            fill="none"
          />
          <Circle
            cx={centerX - faceoffOffsetX}
            cy={faceoffTopY}
            r={3}
            fill="#CC0000"
          />
          
          <Circle
            cx={centerX + faceoffOffsetX}
            cy={faceoffTopY}
            r={faceoffCircleRadius}
            stroke="#CC0000"
            strokeWidth={thinLineWidth}
            fill="none"
          />
          <Circle
            cx={centerX + faceoffOffsetX}
            cy={faceoffTopY}
            r={3}
            fill="#CC0000"
          />
          
          {/* Нижние круги вбрасывания */}
          <Circle
            cx={centerX - faceoffOffsetX}
            cy={faceoffBottomY}
            r={faceoffCircleRadius}
            stroke="#CC0000"
            strokeWidth={thinLineWidth}
            fill="none"
          />
          <Circle
            cx={centerX - faceoffOffsetX}
            cy={faceoffBottomY}
            r={3}
            fill="#CC0000"
          />
          
          <Circle
            cx={centerX + faceoffOffsetX}
            cy={faceoffBottomY}
            r={faceoffCircleRadius}
            stroke="#CC0000"
            strokeWidth={thinLineWidth}
            fill="none"
          />
          <Circle
            cx={centerX + faceoffOffsetX}
            cy={faceoffBottomY}
            r={3}
            fill="#CC0000"
          />
          
          {/* Точки вбрасывания в нейтральной зоне (маленькие) */}
          <Circle
            cx={centerX - faceoffOffsetX}
            cy={neutralFaceoffY1}
            r={3}
            fill="#CC0000"
          />
          <Circle
            cx={centerX + faceoffOffsetX}
            cy={neutralFaceoffY1}
            r={3}
            fill="#CC0000"
          />
          <Circle
            cx={centerX - faceoffOffsetX}
            cy={neutralFaceoffY2}
            r={3}
            fill="#CC0000"
          />
          <Circle
            cx={centerX + faceoffOffsetX}
            cy={neutralFaceoffY2}
            r={3}
            fill="#CC0000"
          />
          
          {/* Ворота (верхние) */}
          <Rect
            x={centerX - goalWidth / 2}
            y={goalLineTop - goalDepth}
            width={goalWidth}
            height={goalDepth}
            stroke="#666666"
            strokeWidth={2}
            fill="rgba(200, 200, 200, 0.3)"
          />
          
          {/* Ворота (нижние) */}
          <Rect
            x={centerX - goalWidth / 2}
            y={goalLineBottom}
            width={goalWidth}
            height={goalDepth}
            stroke="#666666"
            strokeWidth={2}
            fill="rgba(200, 200, 200, 0.3)"
          />
        </G>
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

export default IceRinkMarkings;
