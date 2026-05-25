const React = require('react');
const { View } = require('react-native');

function passthrough(props) {
  return React.createElement(View, props, props.children);
}

const State = {
  UNDETERMINED: 0,
  FAILED: 1,
  BEGAN: 2,
  CANCELLED: 3,
  ACTIVE: 4,
  END: 5,
};

function makeGesture() {
  const g = {};
  const chain = () => g;
  [
    'onStart', 'onUpdate', 'onEnd', 'onBegin', 'onFinalize', 'onChange',
    'numberOfTaps', 'maxDuration', 'minDistance', 'enabled', 'runOnJS',
    'simultaneousWithExternalGesture', 'requireExternalGestureToFail',
  ].forEach((m) => {
    g[m] = chain;
  });
  return g;
}

const Gesture = {
  Pinch: makeGesture,
  Tap: makeGesture,
  Pan: makeGesture,
  LongPress: makeGesture,
  Fling: makeGesture,
  Simultaneous: () => makeGesture(),
  Race: () => makeGesture(),
  Exclusive: () => makeGesture(),
};

module.exports = {
  __esModule: true,
  Gesture,
  GestureDetector: passthrough,
  GestureHandlerRootView: passthrough,
  PinchGestureHandler: passthrough,
  PanGestureHandler: passthrough,
  TapGestureHandler: passthrough,
  LongPressGestureHandler: passthrough,
  FlingGestureHandler: passthrough,
  RotationGestureHandler: passthrough,
  ForceTouchGestureHandler: passthrough,
  NativeViewGestureHandler: passthrough,
  RawButton: passthrough,
  BaseButton: passthrough,
  RectButton: passthrough,
  BorderlessButton: passthrough,
  State,
  Directions: { RIGHT: 1, LEFT: 2, UP: 4, DOWN: 8 },
};
