import React, {useEffect} from 'react';
import '@/shared/i18n'; // side-effect: khởi tạo i18next trước khi màn nào render
import {AppProviders} from '@/app/providers';
import {RootNavigator} from '@/navigation';
import {bindAppStateToQueryFocus, bindNetworkToQuery} from '@/shared/services/query/queryClient';

function App(): React.JSX.Element {
  useEffect(() => {
    // TanStack Query mặc định nghe `visibilitychange` của DOM — React Native
    // không có sự kiện đó, nên `refetchOnWindowFocus` sẽ im lặng không bao giờ
    // chạy nếu không nối tay với AppState.
    bindNetworkToQuery();
    return bindAppStateToQueryFocus();
  }, []);

  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

export default App;
