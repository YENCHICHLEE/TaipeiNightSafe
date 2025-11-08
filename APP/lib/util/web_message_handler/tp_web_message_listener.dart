import 'dart:convert';

import 'package:town_pass/util/web_message_handler/tp_web_message_handler.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

abstract class TPWebMessageListener {
  static List<TPWebMessageHandler> get messageHandler => [
    UserinfoWebMessageHandler(),
    LaunchMapWebMessageHandler(),
    PhoneCallMessageHandler(),
    Agree1999MessageHandler(),
    LocationMessageHandler(),
    DeviceInfoMessageHandler(),
    OpenLinkMessageHandler(),
    NotifyMessageHandler(),
    QRCodeScanMessageHandler(),
    OpenNewPageMessageHandler(),
  ];

  static WebMessageListener webMessageListener() {
    return WebMessageListener(
      jsObjectName: 'flutterObject',
      onPostMessage: (webMessage, sourceOrigin, isMainFrame, replyProxy) async {
        print('[WebMessageListener] 收到訊息');

        if (webMessage == null) {
          print('[WebMessageListener] 訊息為 null');
          return;
        }

        print('[WebMessageListener] 原始訊息: ${webMessage.data}');

        try {
          final Map dataMap = jsonDecode(webMessage.data);
          print('[WebMessageListener] 解析後的訊息: $dataMap');
          print('[WebMessageListener] 訊息名稱: ${dataMap['name']}');

          for (TPWebMessageHandler handler in messageHandler) {
            if (handler.name == dataMap['name']) {
              print('[WebMessageListener] 找到對應的 handler: ${handler.name}');
              await handler.handle(
                message: dataMap['data'],
                sourceOrigin: sourceOrigin,
                isMainFrame: isMainFrame,
                onReply: (reply) {
                  print('[WebMessageListener] 發送回應: ${reply.data}');
                  replyProxy.postMessage(reply);
                },
              );
              return;
            }
          }

          print('[WebMessageListener] 找不到對應的 handler: ${dataMap['name']}');
        } catch (e) {
          print('[WebMessageListener] 解析訊息時發生錯誤: $e');
        }
      },
    );
  }
}
