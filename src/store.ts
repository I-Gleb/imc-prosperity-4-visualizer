import { MantineColorScheme } from '@mantine/core';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Algorithm, ComparisonLabels, VisualizerInput } from './models.ts';

export interface State {
  colorScheme: MantineColorScheme;

  idToken: string;
  round: string;

  visualizer: VisualizerInput | null;

  setColorScheme: (colorScheme: MantineColorScheme) => void;
  setIdToken: (idToken: string) => void;
  setRound: (round: string) => void;
  setAlgorithm: (algorithm: Algorithm | null) => void;
  setComparison: (left: Algorithm, right: Algorithm, labels?: ComparisonLabels) => void;
  setVisualizer: (visualizer: VisualizerInput | null) => void;
}

export const useStore = create<State>()(
  persist(
    set => ({
      colorScheme: 'auto',

      idToken: '',
      round: 'ROUND0',

      visualizer: null,

      setColorScheme: colorScheme => set({ colorScheme }),
      setIdToken: idToken => set({ idToken }),
      setRound: round => set({ round }),
      setAlgorithm: algorithm => set({ visualizer: algorithm === null ? null : { mode: 'single', algorithm } }),
      setComparison: (left, right, labels) => set({ visualizer: { mode: 'comparison', left, right, labels } }),
      setVisualizer: visualizer => set({ visualizer }),
    }),
    {
      name: 'imc-prosperity-4-visualizer',
      partialize: state => ({
        colorScheme: state.colorScheme,
        idToken: state.idToken,
        round: state.round,
      }),
    },
  ),
);
