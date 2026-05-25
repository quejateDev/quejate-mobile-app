const React = require('react');
const { View } = require('react-native');

const ViewShot = React.forwardRef(function ViewShot(props, ref) {
  React.useImperativeHandle(ref, () => ({
    capture: async () => 'file:///mock-view-shot.png',
  }));
  return React.createElement(View, props);
});
ViewShot.displayName = 'ViewShot';

async function captureRef() {
  return 'file:///mock-view-shot.png';
}

module.exports = {
  __esModule: true,
  default: ViewShot,
  ViewShot,
  captureRef,
};
