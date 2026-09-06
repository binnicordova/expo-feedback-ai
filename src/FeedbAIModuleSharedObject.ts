import { SharedObject, useReleasingSharedObject } from 'expo-modules-core';

import FeedbAIModule from './FeedbAIModule';

export declare class FeedbAIModuleSharedObject extends SharedObject {
  count: number;
}

/**
 * Creates a new FeedbAIModuleSharedObject instance.
 * You are responsible for releasing it from memory by calling `release()` when done.
 */
export function createFeedbAIModuleSharedObject(): FeedbAIModuleSharedObject {
  return new FeedbAIModule.FeedbAIModuleSharedObject();
}

/**
 * A hook that creates a FeedbAIModuleSharedObject instance and automatically
 * releases it when the component unmounts.
 */
export function useFeedbAIModuleSharedObject(): FeedbAIModuleSharedObject {
  return useReleasingSharedObject(() => new FeedbAIModule.FeedbAIModuleSharedObject(), []);
}
