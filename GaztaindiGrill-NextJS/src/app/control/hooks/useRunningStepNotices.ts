"use client"

import { useCallback, useMemo, useRef } from 'react';
import { useGrillStateContext } from '@/contexts/GrillStateContext';
import { useCurrentMode } from '@/contexts/CurrentModeContext';
import { GrillModes, type ProgramStep, type RunningProgram } from '@/types';
import { planSimulation, stepNotice, type GrillPose, type SimulationOptions } from '@/utils';

export type StepNoticeText = { text: string; warning: boolean };

// The grill a program on this side really moves: in dual mode both racks follow the left one,
// rotor included. `pose` is null until the grill has reported where it is.
export function useSimulatedGrill(grillIndex: 0 | 1): { pose: GrillPose | null; hasRotor: boolean } {
  const { grillStates } = useGrillStateContext();
  const { currentMode } = useCurrentMode();
  const isDual = currentMode === GrillModes.Dual;
  const state = grillStates[isDual ? 0 : grillIndex];
  const pose = useMemo(
    () => state.lastUpdate === null ? null : { position: state.position, rotation: state.rotation },
    [state.lastUpdate, state.position, state.rotation]
  );
  return { pose, hasRotor: isDual || grillIndex === 0 };
}

// Notices of the steps from the current one on, simulated from `start`.
const simulateNotices = (
  program: RunningProgram,
  steps: ProgramStep[],
  start: GrillPose,
  hasRotor: boolean
): (StepNoticeText | null)[] => {
  const from = Math.max(0, program.currentStepIndex);
  const options: SimulationOptions = { hasRotor, anchor: program.positionAnchor };
  const plan = planSimulation(steps.slice(from), program.referenceType ?? 'absolute', start, options);

  // While a temperature is held the height follows the fire, so anything that depends on it is a guess.
  let held = !!program.hold;
  return steps.map((step, index) => {
    if (index < from) return null;
    const simulated = plan[index - from];
    if (step.position != null) held = false;
    const approximate = held || simulated.holding !== null;

    const notice = stepNotice(simulated);
    return notice && approximate ? { ...notice, text: `${notice.text} (aproximado)` } : notice;
  });
};

// What each step left to run will really do. The steps ahead follow every reading, so moving the
// grill by hand updates them; the step under way keeps the notice it had when it started, or a
// lift before a turn would stop being announced halfway up.
export function useRunningStepNotices(grillIndex: 0 | 1, program: RunningProgram | null) {
  const { pose, hasRotor } = useSimulatedGrill(grillIndex);
  const poseRef = useRef(pose);
  poseRef.current = pose;
  const known = pose !== null;

  // `known` makes a page opened mid-program simulate again once the grill reports its pose.
  const currentNotice = useMemo(() => {
    const start = poseRef.current;
    if (!program || !known || !start) return null;
    return simulateNotices(program, program.steps, start, hasRotor)[Math.max(0, program.currentStepIndex)] ?? null;
  }, [program, hasRotor, known]);

  const noticesFor = useCallback((steps: ProgramStep[]): (StepNoticeText | null)[] => {
    if (!program || !pose) return steps.map(() => null);
    const notices = simulateNotices(program, steps, pose, hasRotor);
    const current = Math.max(0, program.currentStepIndex);
    if (current < notices.length) notices[current] = currentNotice;
    return notices;
  }, [program, pose, hasRotor, currentNotice]);

  const notices = useMemo(() => program ? noticesFor(program.steps) : [], [program, noticesFor]);

  return { notices, noticesFor };
}
