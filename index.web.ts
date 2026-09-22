import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

/**
 * The web build needs CanvasKit in memory before any Skia canvas mounts, so the
 * app is registered only once the WebAssembly runtime has resolved.
 */
LoadSkiaWeb({ locateFile: (file: string) => `/${file}` })
  .then(async () => {
    const { registerRootComponent } = await import('expo');
    const App = (await import('./App')).default;
    registerRootComponent(App);
  })
  .catch((error) => {
    // Without CanvasKit the decorative layers cannot draw; surface it rather than
    // rendering a blank page.
    console.error('BraveVoice: failed to load the Skia web runtime', error);
  });
