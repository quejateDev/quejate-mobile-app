const React = require('react');
const { Text } = require('react-native');

function makeIcon(family) {
  function Icon(props) {
    return React.createElement(Text, { ...props, accessibilityLabel: `${family}:${props.name}` }, '');
  }
  Icon.displayName = family;
  return Icon;
}

const Ionicons = makeIcon('Ionicons');
Ionicons.glyphMap = {};

module.exports = {
  Ionicons,
  MaterialIcons: makeIcon('MaterialIcons'),
  MaterialCommunityIcons: makeIcon('MaterialCommunityIcons'),
  FontAwesome: makeIcon('FontAwesome'),
  FontAwesome5: makeIcon('FontAwesome5'),
  Feather: makeIcon('Feather'),
  AntDesign: makeIcon('AntDesign'),
  Entypo: makeIcon('Entypo'),
  EvilIcons: makeIcon('EvilIcons'),
  Foundation: makeIcon('Foundation'),
  Octicons: makeIcon('Octicons'),
  SimpleLineIcons: makeIcon('SimpleLineIcons'),
  Zocial: makeIcon('Zocial'),
};
