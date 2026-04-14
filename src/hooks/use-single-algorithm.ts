import { Algorithm } from '../models.ts';
import { useStore } from '../store.ts';

export function useSingleAlgorithm(): Algorithm | null {
  return useStore(state => (state.visualizer?.mode === 'single' ? state.visualizer.algorithm : null));
}
