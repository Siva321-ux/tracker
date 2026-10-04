import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../utils/responsive';
import { t } from '../i18n';

export interface ChatMessage {
  id: string | number;
  senderName: string;
  message: string;
  timestamp: string;
  isSelf: boolean;
  synced: boolean;
}

interface ChatBubbleProps {
  msg: ChatMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ msg }) => {
  return (
    <View style={[styles.wrapper, msg.isSelf ? styles.selfWrapper : styles.peerWrapper]}>
      <View style={[styles.bubble, msg.isSelf ? styles.selfBubble : styles.peerBubble]}>
        {!msg.isSelf && <Text style={styles.senderName}>{msg.senderName}</Text>}
        <Text style={[styles.messageText, msg.isSelf ? styles.selfMessageText : styles.peerMessageText]}>
          {msg.message}
        </Text>

        <View style={styles.footerRow}>
          <Text style={[styles.timestamp, msg.isSelf ? styles.selfTimestamp : styles.peerTimestamp]}>
            {msg.timestamp}
          </Text>
          {msg.isSelf && (
            <Text style={styles.statusText}>
              {msg.synced ? ` ✓ ${t('synced')}` : ` ⏳ ${t('waiting_connection')}`}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: Spacing.xs,
    flexDirection: 'row'
  },
  selfWrapper: {
    justifyContent: 'flex-end'
  },
  peerWrapper: {
    justifyContent: 'flex-start'
  },
  bubble: {
    maxWidth: '80%',
    padding: Spacing.md - 2,
    borderRadius: 18,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  selfBubble: {
    backgroundColor: '#18181B',
    borderBottomRightRadius: 4
  },
  peerBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderBottomLeftRadius: 4
  },
  senderName: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20
  },
  selfMessageText: {
    color: '#FFFFFF'
  },
  peerMessageText: {
    color: '#09090B'
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6
  },
  timestamp: {
    fontSize: 10
  },
  selfTimestamp: {
    color: '#A1A1AA'
  },
  peerTimestamp: {
    color: '#71717A'
  },
  statusText: {
    color: Colors.accent,
    fontSize: 10,
    fontWeight: '600'
  }
});
