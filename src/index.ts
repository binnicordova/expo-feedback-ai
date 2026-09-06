// Reexport the native module. On web, it will be resolved to FeedbAIModule.web.ts
// and on native platforms to FeedbAIModule.ts
export { default } from './FeedbAIModule';
export { default as FeedbAIView } from './FeedbAIView';
export * from './FeedbAI.types';
export * from './FeedbAIModuleSharedObject';
