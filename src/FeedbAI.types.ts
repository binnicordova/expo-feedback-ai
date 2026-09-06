import type { StyleProp, ViewStyle } from 'react-native';

export type OnTapEventPayload = Record<string, never>;

export type FeedbAIListProps = {
  onTapItem: (event: { nativeEvent: OnTapEventPayload }) => void;
  itemStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};
