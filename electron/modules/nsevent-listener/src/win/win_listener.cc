#include <napi.h>
#include <windows.h>
#include <iostream>

Napi::ThreadSafeFunction tsfn;
HHOOK keyboardHook;

// 键盘钩子回调函数
LRESULT CALLBACK KeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode >= 0) {
        KBDLLHOOKSTRUCT* pKeyInfo = (KBDLLHOOKSTRUCT*)lParam;
        
        // 检查是否是Ctrl+C
        bool isCtrlDown = GetAsyncKeyState(VK_CONTROL) & 0x8000;
        if (isCtrlDown && pKeyInfo->vkCode == 'C' && wParam == WM_KEYDOWN) {
            if (tsfn) {
                napi_status status = tsfn.BlockingCall([](Napi::Env env, Napi::Function jsCallback) {
                    jsCallback.Call({});
                });
                
                if (status != napi_ok) {
                    std::cerr << "调用JS回调失败" << std::endl;
                }
            }
        }
    }
    return CallNextHookEx(keyboardHook, nCode, wParam, lParam);
}

Napi::Boolean StartListening(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsFunction()) {
        Napi::TypeError::New(env, "需要回调函数").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }
    
    // 清理现有钩子
    if (keyboardHook) {
        UnhookWindowsHookEx(keyboardHook);
        keyboardHook = nullptr;
    }
    
    // 创建线程安全函数
    tsfn = Napi::ThreadSafeFunction::New(
        env,
        info[0].As<Napi::Function>(),
        "Windows键盘监听器",
        0, 1,
        [](Napi::Env) { std::cout << "清理线程安全函数" << std::endl; }
    );
    
    // 设置全局键盘钩子
    keyboardHook = SetWindowsHookEx(WH_KEYBOARD_LL, KeyboardProc, GetModuleHandle(NULL), 0);
    if (!keyboardHook) {
        Napi::Error::New(env, "无法设置键盘钩子").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }
    
    return Napi::Boolean::New(env, true);
}

Napi::Boolean StopListening(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (keyboardHook) {
        UnhookWindowsHookEx(keyboardHook);
        keyboardHook = nullptr;
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