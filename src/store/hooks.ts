import {useDispatch, useSelector, useStore} from 'react-redux';
import type {AppDispatch, AppStore, RootState} from './index';

/**
 * Hook đã gắn kiểu. Dùng những cái này thay cho `useDispatch`/`useSelector`
 * thuần, nếu không thì mọi `state` trong component đều là `unknown` và ta mất
 * toàn bộ lợi ích của TypeScript ở đúng chỗ hay sai nhất.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();
