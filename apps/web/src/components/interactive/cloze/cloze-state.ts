export type ClozeStatus = 'unanswered' | 'wrong' | 'correct';

/** `tried` keeps every wrong pick of the sentence, so each wrong sticker stays locked (design §5.2). */
export type ClozeResult = { status: ClozeStatus; picked?: string; tried: string[] };

export type ClozeState = {
  answers: string[];
  index: number;
  done: boolean;
  results: ClozeResult[];
};

export type ClozeAction = { type: 'pick'; word: string } | { type: 'next' } | { type: 'restart' };

export function createClozeState(answers: string[]): ClozeState {
  return { answers, index: 0, done: false, results: answers.map(() => ({ status: 'unanswered', tried: [] })) };
}

export function clozeReducer(state: ClozeState, action: ClozeAction): ClozeState {
  const last = state.answers.length - 1;
  switch (action.type) {
    case 'pick': {
      const current = state.results[state.index];
      if (state.done || current.status === 'correct' || current.tried.includes(action.word)) return state;
      const status: ClozeStatus = action.word === state.answers[state.index] ? 'correct' : 'wrong';
      const tried = status === 'wrong' ? [...current.tried, action.word] : current.tried;
      const results = state.results.map((r, i) => (i === state.index ? { status, picked: action.word, tried } : r));
      return { ...state, results };
    }
    case 'next':
      return state.index >= last ? { ...state, done: true } : { ...state, index: state.index + 1 };
    case 'restart':
      return createClozeState(state.answers);
  }
}
