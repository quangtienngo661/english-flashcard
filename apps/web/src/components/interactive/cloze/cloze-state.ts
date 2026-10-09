export type ClozeStatus = 'unanswered' | 'wrong' | 'correct';

export type ClozeState = {
  answers: string[];
  index: number;
  done: boolean;
  results: Array<{ status: ClozeStatus; picked?: string }>;
};

export type ClozeAction =
  | { type: 'pick'; word: string }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'goTo'; index: number }
  | { type: 'restart' };

export function createClozeState(answers: string[]): ClozeState {
  return { answers, index: 0, done: false, results: answers.map(() => ({ status: 'unanswered' })) };
}

export function clozeReducer(state: ClozeState, action: ClozeAction): ClozeState {
  const last = state.answers.length - 1;
  switch (action.type) {
    case 'pick': {
      const current = state.results[state.index];
      if (state.done || current.status === 'correct') return state;
      const status: ClozeStatus = action.word === state.answers[state.index] ? 'correct' : 'wrong';
      const results = state.results.map((r, i) => (i === state.index ? { status, picked: action.word } : r));
      return { ...state, results };
    }
    case 'next':
      return state.index >= last ? { ...state, done: true } : { ...state, index: state.index + 1 };
    case 'prev':
      return { ...state, index: Math.max(0, state.index - 1), done: false };
    case 'goTo':
      return { ...state, index: Math.min(Math.max(0, action.index), last), done: false };
    case 'restart':
      return createClozeState(state.answers);
  }
}
