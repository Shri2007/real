import { ComponentType, forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

// react-native-webview's class types don't line up with React 19 types yet; runtime is fine.
const WV = WebView as unknown as ComponentType<any>;

import { detectorHtml } from './detectorHtml';

export type LaughScore = { s: number; smile: number; eye: number; jaw: number; t: number; noFace?: boolean };

export type LaughDetectorHandle = { start: () => void; stop: () => void };

type Props = {
  onScore?: (score: LaughScore) => void;
  onStatus?: (text: string) => void;
  style?: ViewStyle;
};

// Front-camera laugh detector. Camera only runs between start() and stop().
export const LaughDetector = forwardRef<LaughDetectorHandle, Props>(function LaughDetector(
  { onScore, onStatus, style },
  ref,
) {
  const web = useRef<{ injectJavaScript: (js: string) => void } | null>(null);

  const send = (type: 'start' | 'stop') =>
    web.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message',{data:'${JSON.stringify({ type })}'}));true;`,
    );

  useImperativeHandle(ref, () => ({ start: () => send('start'), stop: () => send('stop') }));

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.type === 'score') onScore?.(m);
      else if (m.type === 'status') onStatus?.(m.text);
    } catch {}
  };

  return (
    <View style={[styles.wrap, style]}>
      <WV
        ref={web}
        source={{ html: detectorHtml, baseUrl: 'https://localhost' }}
        originWhitelist={['*']}
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        onMessage={onMessage}
        style={styles.web}
        scrollEnabled={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: '#000' },
  web: { flex: 1, backgroundColor: '#000' },
});
