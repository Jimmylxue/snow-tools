
#import <Cocoa/Cocoa.h>
#import <napi.h>

Napi::ThreadSafeFunction tsfn;
id eventMonitor;

// 添加NSLog调试输出
void eventHandler(NSEvent* event) {
    // NSLog(@"收到事件: %@", event);
    
    if ([event type] == NSEventTypeKeyDown) {
        // NSLog(@"按键码: %d, 修饰键: %lu", [event keyCode], [event modifierFlags]);
        
        if (([event modifierFlags] & NSEventModifierFlagCommand) && 
            [event keyCode] == 8) { // 'C'键
            // NSLog(@"检测到Command+C");
            
            // 确保在主线程执行
            dispatch_async(dispatch_get_main_queue(), ^{
                if (!tsfn) {
                    // NSLog(@"线程安全函数不可用");
                    return;
                }
                
                napi_status status = tsfn.BlockingCall([](Napi::Env env, Napi::Function jsCallback) {
                    // NSLog(@"准备调用JS回调");
                    jsCallback.Call({});
                });
                
                if (status != napi_ok) {
                    NSLog(@"调用JS回调失败");
                }
            });
        }
    }
}

Napi::Boolean StartListening(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // NSLog(@"开始监听键盘事件...");
    
    if (info.Length() < 1 || !info[0].IsFunction()) {
        Napi::TypeError::New(env, "需要回调函数").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }
    
    // 清理现有监听
    if (eventMonitor) {
        [NSEvent removeMonitor:eventMonitor];
        eventMonitor = nil;
    }
    
    // 创建线程安全函数
    tsfn = Napi::ThreadSafeFunction::New(
        env,
        info[0].As<Napi::Function>(),
        "NSEvent监听器",
        0, 1,
        [](Napi::Env) { NSLog(@"清理线程安全函数"); }
    );
    
    // 全局事件监听
    eventMonitor = [NSEvent addGlobalMonitorForEventsMatchingMask:NSEventMaskKeyDown
        handler:^(NSEvent* event) {
            eventHandler(event);
        }
    ];
    
    // NSLog(@"监听器已启动");
    return Napi::Boolean::New(env, true);
}

Napi::Boolean StopListening(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (eventMonitor) {
        [NSEvent removeMonitor:eventMonitor];
        eventMonitor = nil;
    }
    
    if (tsfn) {
        tsfn.Release();
        tsfn = nullptr;
    }
    
    return Napi::Boolean::New(env, true);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("startListening", Napi::Function::New(env, StartListening));
    exports.Set("stopListening", Napi::Function::New(env, StopListening));
    return exports;
}

NODE_API_MODULE(nsevent_listener, Init)