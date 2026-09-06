import { requireNativeView } from 'expo';
import * as React from 'react';

import { FeedbAIViewProps } from './FeedbAI.types';

const NativeView: React.ComponentType<FeedbAIViewProps> = requireNativeView('FeedbAI');

export default function FeedbAIView(props: FeedbAIViewProps) {
  return <NativeView {...props} />;
}
