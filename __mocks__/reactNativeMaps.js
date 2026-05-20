const React = require('react');
const { View } = require('react-native');

function MapView(props) {
  return React.createElement(View, { ...props, accessibilityLabel: 'MapView' }, props.children);
}
MapView.displayName = 'MapView';

function Marker(props) {
  return React.createElement(View, { ...props, accessibilityLabel: 'Marker' });
}
Marker.displayName = 'Marker';

module.exports = {
  __esModule: true,
  default: MapView,
  MapView,
  Marker,
  PROVIDER_GOOGLE: 'google',
  PROVIDER_DEFAULT: 'default',
};
