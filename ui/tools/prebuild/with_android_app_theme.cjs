/* eslint-disable quote-props */
const {
  AndroidConfig,
  withAndroidColors,
  withAndroidColorsNight,
  withAndroidStyles,
} = require("@expo/config-plugins");

const LIGHT_COLORS = {
  colorPrimary: "#55adcc",
  window_background: "#F8F9FA",
};

const NIGHT_COLORS = {
  colorPrimary: "#55adcc",
  window_background: "#121418",
};

const APP_THEME_ITEMS = {
  colorAccent: "@color/colorPrimary",
  "android:colorAccent": "@color/colorPrimary",
  "android:windowBackground": "@color/window_background",
};

function setColorItems(xml, colors) {
  let nextXml = xml;

  for (const [name, value] of Object.entries(colors)) {
    nextXml = AndroidConfig.Colors.assignColorValue(nextXml, { name, value });
  }

  return nextXml;
}

function setAppThemeItems(xml) {
  const parent = AndroidConfig.Styles.getAppThemeGroup();
  let nextXml = xml;

  for (const [name, value] of Object.entries(APP_THEME_ITEMS)) {
    nextXml = AndroidConfig.Styles.assignStylesValue(nextXml, {
      add: true,
      name,
      parent,
      value,
    });
  }

  return nextXml;
}

module.exports = function withAndroidAppTheme(config) {
  config = withAndroidColors(config, (modConfig) => {
    modConfig.modResults = setColorItems(modConfig.modResults, LIGHT_COLORS);
    return modConfig;
  });

  config = withAndroidColorsNight(config, (modConfig) => {
    modConfig.modResults = setColorItems(modConfig.modResults, NIGHT_COLORS);
    return modConfig;
  });

  config = withAndroidStyles(config, (modConfig) => {
    modConfig.modResults = setAppThemeItems(modConfig.modResults);
    return modConfig;
  });

  return config;
};
