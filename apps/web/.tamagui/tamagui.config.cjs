var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/tamagui.config.ts
var tamagui_config_exports = {};
__export(tamagui_config_exports, {
  config: () => config,
  default: () => tamagui_config_default
});
module.exports = __toCommonJS(tamagui_config_exports);

// node_modules/@tamagui/constants/dist/esm/constants.mjs
var import_react = __toESM(require("react"), 1);
var IS_REACT_19 = typeof import_react.default.use < "u";
var isWeb = true;
var isWindowDefined = typeof window < "u";
var isServer = isWeb && !isWindowDefined;
var isClient = isWeb && isWindowDefined;
var useIsomorphicLayoutEffect = isServer ? import_react.useEffect : import_react.useLayoutEffect;
var isChrome = typeof navigator < "u" && /Chrome/.test(navigator.userAgent || "");
var isWebTouchable = isClient && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
var isIos = process.env.TEST_NATIVE_PLATFORM === "ios";

// node_modules/@tamagui/use-presence/dist/esm/PresenceContext.mjs
var React2 = __toESM(require("react"), 1);
var import_jsx_runtime = require("react/jsx-runtime");
var PresenceContext = React2.createContext(null);
var ResetPresence = /* @__PURE__ */ __name((props) => {
  const parent = React2.useContext(PresenceContext);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresenceContext.Provider, {
    value: props.disable ? parent : null,
    children: props.children
  });
}, "ResetPresence");

// node_modules/@tamagui/use-presence/dist/esm/usePresence.mjs
var React3 = __toESM(require("react"), 1);
function usePresence() {
  const context = React3.useContext(PresenceContext);
  if (!context) return [true, null, context];
  const {
    id,
    isPresent: isPresent2,
    onExitComplete,
    register
  } = context;
  return React3.useEffect(() => register(id), []), !isPresent2 && onExitComplete ? [false, () => onExitComplete?.(id), context] : [true, void 0, context];
}
__name(usePresence, "usePresence");

// node_modules/tamagui/dist/esm/createTamagui.mjs
var import_core = require("@tamagui/core");
var createTamagui = process.env.NODE_ENV !== "development" ? import_core.createTamagui : (conf) => {
  const sizeTokenKeys = ["$true"], hasKeys = /* @__PURE__ */ __name((expectedKeys, obj) => expectedKeys.every((k) => typeof obj[k] < "u"), "hasKeys"), tamaguiConfig = (0, import_core.createTamagui)(conf);
  for (const name of ["size", "space"]) {
    const tokenSet = tamaguiConfig.tokensParsed[name];
    if (!tokenSet) throw new Error(`Expected tokens for "${name}" in ${Object.keys(tamaguiConfig.tokensParsed).join(", ")}`);
    if (!hasKeys(sizeTokenKeys, tokenSet)) throw new Error(`
createTamagui() missing expected tokens.${name}:

Received: ${Object.keys(tokenSet).join(", ")}

Expected: ${sizeTokenKeys.join(", ")}

Tamagui expects a "true" key that is the same value as your default size. This is so 
it can size things up or down from the defaults without assuming which keys you use.

Please define a "true" or "$true" key on your size and space tokens like so (example):

size: {
  sm: 2,
  md: 10,
  true: 10, // this means "md" is your default size
  lg: 20,
}

`);
  }
  const expected = Object.keys(tamaguiConfig.tokensParsed.size);
  for (const name of ["radius", "zIndex"]) {
    const tokenSet = tamaguiConfig.tokensParsed[name], received = Object.keys(tokenSet);
    if (!received.some((rk) => expected.includes(rk))) throw new Error(`
createTamagui() invalid tokens.${name}:

Received: ${received.join(", ")}

Expected a subset of: ${expected.join(", ")}

`);
  }
  return tamaguiConfig;
};

// node_modules/@tamagui/font-inter/dist/esm/index.mjs
var import_core2 = require("@tamagui/core");
var createInterFont = /* @__PURE__ */ __name((font = {}, {
  sizeLineHeight = /* @__PURE__ */ __name((size) => size + 10, "sizeLineHeight"),
  sizeSize = /* @__PURE__ */ __name((size) => size * 1, "sizeSize")
} = {}) => {
  const size = Object.fromEntries(Object.entries({
    ...defaultSizes,
    ...font.size
  }).map(([k, v]) => [k, sizeSize(+v)]));
  return (0, import_core2.createFont)({
    family: import_core2.isWeb ? 'Inter, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' : "Inter",
    lineHeight: Object.fromEntries(Object.entries(size).map(([k, v]) => [k, sizeLineHeight((0, import_core2.getVariableValue)(v))])),
    weight: {
      4: "300"
    },
    letterSpacing: {
      4: 0
    },
    ...font,
    size
  });
}, "createInterFont");
var defaultSizes = {
  1: 11,
  2: 12,
  3: 13,
  4: 14,
  true: 14,
  5: 16,
  6: 18,
  7: 20,
  8: 23,
  9: 30,
  10: 46,
  11: 55,
  12: 62,
  13: 72,
  14: 92,
  15: 114,
  16: 134
};

// node_modules/@tamagui/shorthands/dist/esm/index.mjs
var shorthands = {
  // web-only
  ussel: "userSelect",
  cur: "cursor",
  // tamagui
  pe: "pointerEvents",
  // text
  col: "color",
  ff: "fontFamily",
  fos: "fontSize",
  fost: "fontStyle",
  fow: "fontWeight",
  ls: "letterSpacing",
  lh: "lineHeight",
  ta: "textAlign",
  tt: "textTransform",
  ww: "wordWrap",
  // view
  ac: "alignContent",
  ai: "alignItems",
  als: "alignSelf",
  b: "bottom",
  bc: "backgroundColor",
  bg: "backgroundColor",
  bbc: "borderBottomColor",
  bblr: "borderBottomLeftRadius",
  bbrr: "borderBottomRightRadius",
  bbw: "borderBottomWidth",
  blc: "borderLeftColor",
  blw: "borderLeftWidth",
  boc: "borderColor",
  br: "borderRadius",
  bs: "borderStyle",
  brw: "borderRightWidth",
  brc: "borderRightColor",
  btc: "borderTopColor",
  btlr: "borderTopLeftRadius",
  btrr: "borderTopRightRadius",
  btw: "borderTopWidth",
  bw: "borderWidth",
  dsp: "display",
  f: "flex",
  fb: "flexBasis",
  fd: "flexDirection",
  fg: "flexGrow",
  fs: "flexShrink",
  fw: "flexWrap",
  h: "height",
  jc: "justifyContent",
  l: "left",
  m: "margin",
  mah: "maxHeight",
  maw: "maxWidth",
  mb: "marginBottom",
  mih: "minHeight",
  miw: "minWidth",
  ml: "marginLeft",
  mr: "marginRight",
  mt: "marginTop",
  mx: "marginHorizontal",
  my: "marginVertical",
  o: "opacity",
  ov: "overflow",
  p: "padding",
  pb: "paddingBottom",
  pl: "paddingLeft",
  pos: "position",
  pr: "paddingRight",
  pt: "paddingTop",
  px: "paddingHorizontal",
  py: "paddingVertical",
  r: "right",
  shac: "shadowColor",
  shar: "shadowRadius",
  shof: "shadowOffset",
  shop: "shadowOpacity",
  t: "top",
  w: "width",
  zi: "zIndex"
};
shorthands.bls = "borderLeftStyle";
shorthands.brs = "borderRightStyle";
shorthands.bts = "borderTopStyle";
shorthands.bbs = "borderBottomStyle";
shorthands.bxs = "boxSizing";
shorthands.bxsh = "boxShadow";
shorthands.ox = "overflowX";
shorthands.oy = "overflowY";

// node_modules/@tamagui/animations-css/dist/esm/createAnimations.mjs
var import_web = require("@tamagui/core");
var import_react2 = __toESM(require("react"), 1);
function extractDuration(animation) {
  const msMatch = animation.match(/(\d+(?:\.\d+)?)\s*ms/);
  if (msMatch) return Number.parseInt(msMatch[1], 10);
  const sMatch = animation.match(/(\d+(?:\.\d+)?)\s*s/);
  return sMatch ? Math.round(Number.parseFloat(sMatch[1]) * 1e3) : 300;
}
__name(extractDuration, "extractDuration");
function createAnimations(animations2) {
  const reactionListeners = /* @__PURE__ */ new WeakMap();
  return {
    animations: animations2,
    usePresence,
    ResetPresence,
    supportsCSS: true,
    classNameAnimation: true,
    useAnimatedNumber(initial) {
      const [val, setVal] = import_react2.default.useState(initial), [onFinish, setOnFinish] = (0, import_react2.useState)();
      return useIsomorphicLayoutEffect(() => {
        onFinish && (onFinish?.(), setOnFinish(void 0));
      }, [onFinish]), {
        getInstance() {
          return setVal;
        },
        getValue() {
          return val;
        },
        setValue(next, config2, onFinish2) {
          setVal(next), setOnFinish(onFinish2);
        },
        stop() {
        }
      };
    },
    useAnimatedNumberReaction({
      value
    }, onValue) {
      import_react2.default.useEffect(() => {
        const instance = value.getInstance();
        let queue = reactionListeners.get(instance);
        if (!queue) {
          const next = /* @__PURE__ */ new Set();
          reactionListeners.set(instance, next), queue = next;
        }
        return queue.add(onValue), () => {
          queue?.delete(onValue);
        };
      }, []);
    },
    useAnimatedNumberStyle(val, getStyle) {
      return getStyle(val.getValue());
    },
    useAnimations: /* @__PURE__ */ __name(({
      props,
      presence,
      style,
      componentState,
      stateRef
    }) => {
      const isEntering = !!componentState.unmounted, isExiting = presence?.[0] === false, sendExitComplete = presence?.[1], [animationKey, animationConfig] = Array.isArray(props.animation) ? props.animation : [props.animation], animation = animations2[animationKey], keys = props.animateOnly ?? ["all"];
      return useIsomorphicLayoutEffect(() => {
        const host = stateRef.current.host;
        if (!sendExitComplete || !isExiting || !host) return;
        const node = host, fallbackTimeout = animation ? extractDuration(animation) : 200, timeoutId = setTimeout(() => {
          sendExitComplete?.();
        }, fallbackTimeout), onFinishAnimation = /* @__PURE__ */ __name(() => {
          clearTimeout(timeoutId), sendExitComplete?.();
        }, "onFinishAnimation");
        return node.addEventListener("transitionend", onFinishAnimation), node.addEventListener("transitioncancel", onFinishAnimation), () => {
          clearTimeout(timeoutId), node.removeEventListener("transitionend", onFinishAnimation), node.removeEventListener("transitioncancel", onFinishAnimation);
        };
      }, [sendExitComplete, isExiting]), animation && (Array.isArray(style.transform) && (style.transform = (0, import_web.transformsToString)(style.transform)), style.transition = keys.map((key) => {
        const override = animations2[animationConfig?.[key]] ?? animation;
        return `${key} ${override}`;
      }).join(", ")), process.env.NODE_ENV === "development" && props.debug === "verbose" && console.info("CSS animation", {
        props,
        animations: animations2,
        animation,
        animationKey,
        style,
        isEntering,
        isExiting
      }), animation ? {
        style,
        className: isEntering ? "t_unmounted" : ""
      } : null;
    }, "useAnimations")
  };
}
__name(createAnimations, "createAnimations");

// ../../node_modules/tamagui/dist/esm/index.mjs
var import_core3 = require("@tamagui/core");

// ../../packages/ui/src/theme/tokens.ts
var tokens = (0, import_core3.createTokens)({
  color: {
    // Base colors (from mobile dark theme)
    background: "#1a1a2e",
    backgroundLight: "#f5f5f5",
    surface: "#16213e",
    surfaceLight: "#ffffff",
    card: "#16213e",
    cardLight: "#ffffff",
    // Text colors
    text: "#ffffff",
    textLight: "#1a1a2e",
    textSecondary: "#cccccc",
    textSecondaryLight: "#444444",
    textMuted: "#888888",
    textMutedLight: "#666666",
    // Primary brand color (mobile)
    primary: "#e94560",
    primaryLight: "#ff6b6b",
    // BillGreen brand color (web)
    billGreen50: "#ecfdf5",
    billGreen100: "#d1fae5",
    billGreen200: "#a7f3d0",
    billGreen300: "#6ee7b7",
    billGreen400: "#34d399",
    billGreen500: "#10b981",
    billGreen600: "#059669",
    billGreen700: "#047857",
    billGreen800: "#065f46",
    billGreen900: "#064e3b",
    // Semantic colors
    success: "#44aa44",
    successLight: "#2d8a2d",
    danger: "#ff4444",
    dangerLight: "#cc3333",
    warning: "#ffcc00",
    warningLight: "#cc9900",
    // Border colors
    border: "#0f3460",
    borderLight: "#dddddd",
    borderLighter: "#eeeeee",
    // Status colors for due dates
    statusOverdue: "#ff4444",
    statusDueToday: "#ff8800",
    statusDueSoon: "#ffcc00",
    statusOk: "#44aa44",
    // Transparent
    transparent: "transparent",
    white: "#ffffff",
    black: "#000000"
  },
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    true: 16
  },
  size: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    true: 16
  },
  radius: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    true: 8
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500
  }
});

// ../../packages/ui/src/theme/themes.ts
var darkTheme = (0, import_core3.createTheme)({
  background: tokens.color.background,
  backgroundHover: tokens.color.surface,
  backgroundPress: tokens.color.border,
  backgroundFocus: tokens.color.surface,
  color: tokens.color.text,
  colorHover: tokens.color.text,
  colorPress: tokens.color.textSecondary,
  colorFocus: tokens.color.text,
  borderColor: tokens.color.border,
  borderColorHover: tokens.color.primary,
  borderColorFocus: tokens.color.primary,
  borderColorPress: tokens.color.border,
  placeholderColor: tokens.color.textMuted,
  // Semantic
  primary: tokens.color.primary,
  primaryHover: tokens.color.primaryLight,
  success: tokens.color.success,
  danger: tokens.color.danger,
  warning: tokens.color.warning,
  // Surfaces
  surface: tokens.color.surface,
  card: tokens.color.card,
  // Text variants
  textMuted: tokens.color.textMuted,
  textSecondary: tokens.color.textSecondary
});
var lightTheme = (0, import_core3.createTheme)({
  background: tokens.color.backgroundLight,
  backgroundHover: tokens.color.surfaceLight,
  backgroundPress: tokens.color.borderLight,
  backgroundFocus: tokens.color.surfaceLight,
  color: tokens.color.textLight,
  colorHover: tokens.color.textLight,
  colorPress: tokens.color.textSecondaryLight,
  colorFocus: tokens.color.textLight,
  borderColor: tokens.color.borderLight,
  borderColorHover: tokens.color.primary,
  borderColorFocus: tokens.color.primary,
  borderColorPress: tokens.color.borderLight,
  placeholderColor: tokens.color.textMutedLight,
  // Semantic
  primary: tokens.color.primary,
  primaryHover: tokens.color.primaryLight,
  success: tokens.color.successLight,
  danger: tokens.color.dangerLight,
  warning: tokens.color.warningLight,
  // Surfaces
  surface: tokens.color.surfaceLight,
  card: tokens.color.cardLight,
  // Text variants
  textMuted: tokens.color.textMutedLight,
  textSecondary: tokens.color.textSecondaryLight
});
var billGreenTheme = (0, import_core3.createTheme)({
  ...lightTheme,
  primary: tokens.color.billGreen500,
  primaryHover: tokens.color.billGreen600
});

// src/tamagui.config.ts
var animations = createAnimations({
  fast: "ease-in 150ms",
  medium: "ease-in 250ms",
  slow: "ease-in 450ms",
  quick: "ease-in 100ms",
  tooltip: "ease-in 200ms"
});
var headingFont = createInterFont({
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40
  },
  weight: {
    4: "600",
    5: "600",
    6: "700",
    7: "700"
  }
});
var bodyFont = createInterFont({
  size: {
    1: 11,
    2: 12,
    3: 13,
    4: 14,
    5: 16,
    6: 18,
    7: 20,
    8: 22,
    9: 24,
    10: 26
  },
  weight: {
    1: "400",
    2: "400",
    3: "500",
    4: "500",
    5: "600",
    6: "600"
  }
});
var config = createTamagui({
  defaultTheme: "dark",
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
  shorthands,
  fonts: {
    heading: headingFont,
    body: bodyFont
  },
  themes: {
    dark: darkTheme,
    light: lightTheme,
    billGreen: billGreenTheme
  },
  tokens,
  animations,
  media: {
    xs: { maxWidth: 480 },
    sm: { maxWidth: 640 },
    md: { maxWidth: 768 },
    lg: { maxWidth: 1024 },
    xl: { maxWidth: 1280 },
    xxl: { maxWidth: 1536 },
    gtXs: { minWidth: 481 },
    gtSm: { minWidth: 641 },
    gtMd: { minWidth: 769 },
    gtLg: { minWidth: 1025 },
    short: { maxHeight: 820 },
    tall: { minHeight: 820 },
    hoverNone: { hover: "none" },
    pointerCoarse: { pointer: "coarse" }
  }
});
var tamagui_config_default = config;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  config
});
