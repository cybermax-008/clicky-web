import type { NavigationState } from './types';

export function createIdleState(): NavigationState {
  return { type: 'idle' };
}

export function isActiveNavigation(state: NavigationState): boolean {
  return state.type !== 'idle';
}

export function isWorkingState(state: NavigationState): boolean {
  return state.type === 'planning' || state.type === 'verifyingStepCompletion';
}
