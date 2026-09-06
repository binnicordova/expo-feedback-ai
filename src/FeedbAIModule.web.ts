import { registerWebModule, NativeModule } from 'expo';

import { FeedbAIModuleEvents } from './FeedbAI.types';

class FeedbAIModule extends NativeModule<FeedbAIModuleEvents> {
  PI = Math.PI;

  hello() {
    return 'Hello world! 👋';
  }

  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
}

export default registerWebModule(FeedbAIModule, 'FeedbAIModule');
