#import <React/RCTBridgeModule.h>

// Chỉ export constants — không có method nào. Tên module phải khớp
// @objc(MapperAppEnv) trong AppEnvModule.swift và AppEnvModule.kt bên Android.
@interface RCT_EXTERN_MODULE(MapperAppEnv, NSObject)
@end
