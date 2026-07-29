import type {RootState} from '@/store/rootReducer';

/** Selector của feature widget. `import type` để không tạo vòng với rootReducer. */
export const selectWidget = (state: RootState) => state.widget;
