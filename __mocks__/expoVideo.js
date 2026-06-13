const React = require('react');
const { View } = require('react-native');

function VideoView(props) {
  return React.createElement(View, { ...props, accessibilityLabel: 'VideoView' });
}
VideoView.displayName = 'VideoView';

function useVideoPlayer() {
  return { loop: false, play: () => {}, pause: () => {}, release: () => {} };
}

module.exports = {
  __esModule: true,
  VideoView,
  useVideoPlayer,
};
