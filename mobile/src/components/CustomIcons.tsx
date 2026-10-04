import React from 'react';
import { View, StyleSheet } from 'react-native';

interface IconProps {
  color?: string;
  size?: number;
}

// Custom Professional Vector Icon: Map
export const MapIcon: React.FC<IconProps> = ({ color = '#18181B', size = 20 }) => (
  <View style={[styles.iconBox, { width: size, height: size }]}>
    <View style={[styles.borderBox, { borderColor: color }]}>
      <View style={[styles.diagonalLine1, { backgroundColor: color }]} />
      <View style={[styles.diagonalLine2, { backgroundColor: color }]} />
    </View>
  </View>
);

// Custom Professional Vector Icon: Team
export const TeamIcon: React.FC<IconProps> = ({ color = '#18181B', size = 20 }) => (
  <View style={[styles.iconBox, { width: size, height: size }]}>
    <View style={[styles.userHead, { borderColor: color }]} />
    <View style={[styles.userBody, { borderColor: color }]} />
  </View>
);

// Custom Professional Vector Icon: Chat
export const ChatIcon: React.FC<IconProps> = ({ color = '#18181B', size = 20 }) => (
  <View style={[styles.iconBox, { width: size, height: size }]}>
    <View style={[styles.chatBubble, { borderColor: color }]}>
      <View style={[styles.chatTail, { backgroundColor: color }]} />
    </View>
  </View>
);

// Custom Professional Vector Icon: Offline Maps / Download
export const DownloadIcon: React.FC<IconProps> = ({ color = '#18181B', size = 20 }) => (
  <View style={[styles.iconBox, { width: size, height: size }]}>
    <View style={[styles.arrowStem, { backgroundColor: color }]} />
    <View style={[styles.arrowHead, { borderColor: color }]} />
    <View style={[styles.trayLine, { backgroundColor: color }]} />
  </View>
);

// Custom Professional Vector Icon: Notifications / Bell
export const BellIcon: React.FC<IconProps> = ({ color = '#18181B', size = 20 }) => (
  <View style={[styles.iconBox, { width: size, height: size }]}>
    <View style={[styles.bellDome, { borderColor: color }]} />
    <View style={[styles.bellClapper, { backgroundColor: color }]} />
  </View>
);

// Custom Professional Vector Icon: Settings / Gear
export const GearIcon: React.FC<IconProps> = ({ color = '#18181B', size = 20 }) => (
  <View style={[styles.iconBox, { width: size, height: size }]}>
    <View style={[styles.gearCircle, { borderColor: color }]}>
      <View style={[styles.gearDot, { backgroundColor: color }]} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  // Map Icon Styles
  borderBox: {
    width: '85%',
    height: '85%',
    borderWidth: 2,
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden'
  },
  diagonalLine1: {
    position: 'absolute',
    left: '30%',
    top: 0,
    bottom: 0,
    width: 2
  },
  diagonalLine2: {
    position: 'absolute',
    right: '30%',
    top: 0,
    bottom: 0,
    width: 2
  },
  // Team Icon Styles
  userHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    marginBottom: 1
  },
  userBody: {
    width: 14,
    height: 6,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 2,
    borderBottomWidth: 0
  },
  // Chat Icon Styles
  chatBubble: {
    width: '85%',
    height: '75%',
    borderWidth: 2,
    borderRadius: 6,
    position: 'relative'
  },
  chatTail: {
    position: 'absolute',
    bottom: -3,
    left: 4,
    width: 5,
    height: 3,
    borderRadius: 1
  },
  // Download Icon Styles
  arrowStem: {
    width: 2,
    height: 9,
    top: 1
  },
  arrowHead: {
    width: 6,
    height: 6,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }],
    marginTop: -4
  },
  trayLine: {
    width: 14,
    height: 2,
    borderRadius: 1,
    marginTop: 3
  },
  // Bell Icon Styles
  bellDome: {
    width: 12,
    height: 11,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 2,
    borderBottomWidth: 0
  },
  bellClapper: {
    width: 4,
    height: 3,
    borderRadius: 2,
    marginTop: 1
  },
  // Gear Icon Styles
  gearCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  gearDot: {
    width: 4,
    height: 4,
    borderRadius: 2
  }
});
