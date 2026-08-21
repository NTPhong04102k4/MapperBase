import {useEffect, useRef, useState} from 'react';
import {AppState} from 'react-native';
import {formatDuration} from '@/shared/utils/format';

/**
 * Đếm ngược tới một mốc thời gian, trả về chuỗi `mm:ss`.
 *
 * Hai chi tiết dễ làm sai:
 *
 *  1. **Đừng đếm lùi từ một biến đếm.** `setInterval` bị hệ điều hành bóp khi
 *     app ở nền, nên số giây trôi mất. Ở đây luôn tính lại từ `Date.now()`, nên
 *     quay lại app là số đúng ngay lập tức.
 *
 *  2. **Dừng interval khi app vào nền.** Không dừng thì vẫn bị OS bóp, mà lại
 *     tốn pin và giữ một timer sống vô ích.
 */
export function useCountdown(target: string | number | Date | null): string | null {
  const [remaining, setRemaining] = useState<number>(() => computeRemaining(target));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (target === null) {
      setRemaining(0);
      return;
    }

    const tick = () => setRemaining(computeRemaining(target));

    const start = () => {
      tick();
      if (timerRef.current) {
        return;
      }
      timerRef.current = setInterval(tick, 1000);
    };

    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    start();

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        start();
      } else {
        stop();
      }
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, [target]);

  if (target === null) {
    return null;
  }
  return formatDuration(remaining);
}

function computeRemaining(target: string | number | Date | null): number {
  if (target === null) {
    return 0;
  }
  return Math.max(0, new Date(target).getTime() - Date.now());
}
