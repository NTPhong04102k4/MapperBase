/**
 * Feature widget không có màn hình riêng: nó là state + đồng bộ sang widget
 * native. Màn hình nào cần hiển thị (HomeScreen) thì import từ đây.
 */
export {EMPTY_SNAPSHOT} from './types';
export type {WidgetSnapshot} from './types';
export {widgetActions} from './store/widgetSlice';
export type {WidgetState} from './store/widgetSlice';
export {widgetSideEffects} from './store/widgetSaga';
export {selectWidget} from './store/selectors';
