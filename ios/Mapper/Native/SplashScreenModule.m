#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(MapperSplashScreen, NSObject)

RCT_EXTERN_METHOD(hide:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(show:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
