{
  "targets": [
    {
      "target_name": "nsevent_listener",
      "sources": [
        "<!@(node -p \"process.platform === 'darwin' ? 'src/mac/nsevent_listener.mm' : 'src/win/win_listener.cc'\")"
      ],
      "conditions": [
        ["OS=='mac'", {
          "frameworks": ["Cocoa"],
          "xcode_settings": {
            "OTHER_CPLUSPLUSFLAGS": ["-std=c++14", "-stdlib=libc++"],
            "OTHER_LDFLAGS": ["-stdlib=libc++"],
            "MACOSX_DEPLOYMENT_TARGET": "10.13"
          }
        }],
        ["OS=='win'", {
          "libraries": ["User32.lib"],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "AdditionalOptions": [
                "/std:c++17",
                "/utf-8",  # 强制使用 UTF-8 编码
                "/wd4819"  # 可选：禁用该警告
              ],
              "LanguageStandard": "stdcpp17"
            }
          },
          "defines": [
            "WIN32_LEAN_AND_MEAN",
            "_CRT_SECURE_NO_WARNINGS"
          ]
        }]
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "cflags": ["-std=c++14"]
    }
  ]
}