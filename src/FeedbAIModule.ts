import { NativeModule, requireNativeModule } from 'expo';

import { FeedbAIModuleEvents } from './FeedbAI.types';
import type { FeedbAIModuleSharedObject } from './FeedbAIModuleSharedObject';

declare class FeedbAIModule extends NativeModule<FeedbAIModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
  FeedbAIModuleSharedObject: typeof FeedbAIModuleSharedObject;
}

export default requireNativeModule<FeedbAIModule>('FeedbAI');
