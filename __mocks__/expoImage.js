const React = require('react');
const { View } = require('react-native');

function Image(props) {
  return React.createElement(View, { ...props, accessibilityLabel: props.accessibilityLabel ?? 'Image' });
}
Image.displayName = 'Image';

module.exports = {
  __esModule: true,
  Image,
};
