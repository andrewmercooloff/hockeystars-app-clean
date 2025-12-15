import React, { memo } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import Svg, { Circle, Line, Rect, G } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface IceRinkMarkingsProps {
  width?: number;
  height?: number;
  opacity?: number;
}

/**
 * Компонент для отрисовки разметки хоккейного поля
 * Адаптирован для вертикальной ориентации экрана телефона
 */
const IceRinkMarkings: React.FC<IceRinkMarkingsProps> = memo(({ 
  width = SCREEN_WIDTH, 
  height = SCREEN_HEIGHT,
  opacity = 0.5 
}) => {
  // Центр экрана
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Размеры элементов (пропорционально экрану)
  const centerCircleRadius = Math.min(width, height) * 0.12;
  const faceoffCircleRadius = Math.min(width, height) * 0.08;
  const goalWidth = width * 0.15;
  const goalDepth = 8;
  const lineWidth = 3;
  const thinLineWidth = 2;
  
  // Позиции линий (вертикальная ориентация - "ворота" сверху и снизу)
  const blueLineTop = height * 0.28;
  const blueLineBottom = height * 0.72;
  const goalLineTop = height * 0.08;
  const goalLineBottom = height * 0.92;
  
  // Позиции кругов вбрасывания
  const faceoffOffsetX = width * 0.28;
  const faceoffTopY = height * 0.18;
  const faceoffBottomY = height * 0.82;
  
  // Позиции точек вбрасывания в нейтральной зоне
  const neutralFaceoffY1 = height * 0.38;
  const neutralFaceoffY2 = height * 0.62;

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
          
          {/* Вратарские зоны (полукруги) */}
          <Circle
            cx={centerX}
            cy={goalLineTop}
            r={goalWidth * 0.6}
            stroke="#CC0000"
            strokeWidth={thinLineWidth}
            fill="rgba(135, 206, 250, 0.15)"
          />
          <Circle
            cx={centerX}
            cy={goalLineBottom}
            r={goalWidth * 0.6}
            stroke="#CC0000"
            strokeWidth={thinLineWidth}
            fill="rgba(135, 206, 250, 0.15)"
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
