import React from 'react';
import { TouchableOpacity, Image, StyleSheet, ViewStyle, Platform, View, Text } from 'react-native';
// import Animated from 'react-native-reanimated';

interface PuckProps {
  avatar?: any;
  onPress: () => void;
  animatedStyle?: any;
}

const Puck: React.FC<PuckProps> = ({ avatar, onPress, animatedStyle }) => {
  const [imageError, setImageError] = React.useState(false);

  return (
    <View style={[styles.puck, animatedStyle]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {avatar && !imageError ? (
          <Image 
            source={avatar} 
            style={styles.avatar}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.fallbackContainer, { backgroundColor: '#FF6B6B' }]}>
            <Text style={styles.fallbackText}>?</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  puck: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    ...Platform.select({
      ios: {
        shadowColor: '#050008',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(11, 11, 14, 0.3)',
      },
    }),
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  fallbackContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Gilroy-Bold',
  },
});

export default Puck; 