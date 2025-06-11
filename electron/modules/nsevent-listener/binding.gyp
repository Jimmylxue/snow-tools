{
  "targets": [
    {
      "target_name": "nsevent_listener",
      "sources": ["nsevent_listener.mm"],
      "frameworks": ["Cocoa"],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "<!(node -e \"console.log(require('node-addon-api').include)\")"
      ],
      "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "cflags": ["-std=c++14"],
      "xcode_settings": {
        "OTHER_CPLUSPLUSFLAGS": ["-std=c++14", "-stdlib=libc++"],
        "OTHER_LDFLAGS": ["-stdlib=libc++"],
        "MACOSX_DEPLOYMENT_TARGET": "10.13"
      }
    }
  ]
}