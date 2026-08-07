import { assign, createActor, createMachine } from 'xstate';
import { g } from './shared.js';

const clearSwap = assign({ first: null, second: null });
const setSwap = assign({
  first: ({ event }) => event.first,
  second: ({ event }) => event.second,
  sessionId: ({ event }) => event.sessionId
});
const setSession = assign({
  first: null,
  second: null,
  sessionId: ({ event }) => event.sessionId
});

export const boardFlowMachine = createMachine({
  id: 'boardFlow',
  initial: 'idle',
  context: { first: null, second: null, sessionId: 0 },
  states: {
    idle: {
      on: {
        SWAP: { target: 'swapValidate', actions: setSwap },
        RESOLVE: { target: 'resolveMatching', actions: setSession }
      }
    },
    swapValidate: {
      on: {
        REVERT: 'swapReverting',
        RESOLVE: { target: 'resolveMatching', actions: clearSwap },
        RESET: { target: 'idle', actions: clearSwap }
      }
    },
    swapReverting: { on: { RESET: { target: 'idle', actions: clearSwap } } },
    resolveMatching: {
      on: {
        PRIME: 'resolvePrimed',
        RESET: { target: 'idle', actions: clearSwap }
      }
    },
    resolvePrimed: {
      on: {
        BURST: 'resolveBurst',
        RESET: { target: 'idle', actions: clearSwap }
      }
    },
    resolveBurst: {
      on: {
        DROP: 'resolveDropping',
        RESET: { target: 'idle', actions: clearSwap }
      }
    },
    resolveDropping: {
      on: {
        NEXT: 'resolveMatching',
        RESET: { target: 'idle', actions: clearSwap }
      }
    }
  }
});

export function resolutionFromBoardFlow(snapshot) {
  const { first, second } = snapshot.context;
  switch (snapshot.value) {
    case 'swapValidate': return { kind: 'swap', phase: 'validate', first, second };
    case 'swapReverting': return { kind: 'swap', phase: 'reverting', first, second };
    case 'resolveMatching': return { kind: 'resolve', phase: 'matching' };
    case 'resolvePrimed': return { kind: 'resolve', phase: 'primed' };
    case 'resolveBurst': return { kind: 'resolve', phase: 'burst' };
    case 'resolveDropping': return { kind: 'resolve', phase: 'dropping' };
    default: return null;
  }
}

export function attachBoardFlow() {
  let actor = null;
  let subscription = null;
  const history = [];

  function send(event) {
    if (!actor) restartBoardFlow();
    actor.send(event);
  }

  function replayResolution(resolution) {
    if (!resolution) return;
    const sessionId = g.state.sessionId;
    if (resolution.kind === 'swap') {
      send({ type: 'SWAP', first: resolution.first, second: resolution.second, sessionId });
      if (resolution.phase === 'reverting') send({ type: 'REVERT' });
      return;
    }
    send({ type: 'RESOLVE', sessionId });
    if (['primed', 'burst', 'dropping'].includes(resolution.phase)) send({ type: 'PRIME' });
    if (['burst', 'dropping'].includes(resolution.phase)) send({ type: 'BURST' });
    if (resolution.phase === 'dropping') send({ type: 'DROP' });
  }

  function restartBoardFlow(resolution = null) {
    subscription?.unsubscribe();
    actor?.stop();
    actor = createActor(boardFlowMachine);
    subscription = actor.subscribe((snapshot) => {
      g.state.resolution = resolutionFromBoardFlow(snapshot);
      history.push({ value: snapshot.value, resolution: g.state.resolution ? { ...g.state.resolution } : null });
      if (history.length > 60) history.shift();
    });
    actor.start();
    replayResolution(resolution);
    return g.state.resolution;
  }

  function startSwapFlow(first, second) {
    if (actor?.getSnapshot().value !== 'idle') restartBoardFlow();
    send({ type: 'SWAP', first, second, sessionId: g.state.sessionId });
  }

  function startResolveFlow() {
    const value = actor?.getSnapshot().value;
    if (value !== 'idle' && value !== 'swapValidate') restartBoardFlow();
    send({ type: 'RESOLVE', sessionId: g.state.sessionId });
  }

  function completeBoardFlow() {
    const value = actor?.getSnapshot().value;
    if (value && value !== 'idle') send({ type: 'RESET' });
  }

  function boardFlowSnapshot() {
    const snapshot = actor?.getSnapshot();
    return {
      value: snapshot?.value || 'idle',
      context: snapshot ? { ...snapshot.context } : {},
      history: history.map((entry) => ({ ...entry, resolution: entry.resolution ? { ...entry.resolution } : null }))
    };
  }

  Object.assign(g, {
    restartBoardFlow,
    startSwapFlow,
    revertSwapFlow: () => send({ type: 'REVERT' }),
    startResolveFlow,
    primeBoardFlow: () => send({ type: 'PRIME' }),
    burstBoardFlow: () => send({ type: 'BURST' }),
    dropBoardFlow: () => send({ type: 'DROP' }),
    nextBoardFlow: () => send({ type: 'NEXT' }),
    completeBoardFlow,
    boardFlowSnapshot
  });
  restartBoardFlow();
}
