import * as React from 'react';

import { FeedbAIViewProps } from './FeedbAI.types';

export default function FeedbAIView(props: FeedbAIViewProps) {
  return (
    <div
      style={{
        backgroundColor: '#aabbcc',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={() => props.onTap({ nativeEvent: {} })}>
      <span>FeedbAI - native view</span>
      <span>Tap the view to emit a view event</span>
    </div>
  );
}
