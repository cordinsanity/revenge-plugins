import { storage, manifest } from "@vendetta/plugin";
import { React, ReactNative, NavigationNative } from "@vendetta/metro/common";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { after } from "@vendetta/patcher";
import { Forms } from "@vendetta/ui/components";
import { findInReactTree } from "@vendetta/utils";
import { findByProps } from "@vendetta/metro";
import { logger } from "@vendetta";
import ProxifierPage from "./Settings.js";

const { FormSection, FormRow } = Forms;
const TableRowIconMod = findByProps("TableRowIcon");
const TableRowIcon = TableRowIconMod?.TableRowIcon;

const bunny = window.bunny;
const tabsNavigationRef = bunny?.metro?.findByPropsLazy?.("getRootNavigationRef");
const settingConstants = bunny?.metro?.findByPropsLazy?.("SETTING_RENDERER_CONFIG");
const SettingsOverviewScreen = bunny?.metro?.findByNameLazy?.("SettingsOverviewScreen", false);
const createListModule = bunny?.metro?.findByPropsLazy?.("createList");

function Section({ tabs }) {
  const navigation = NavigationNative.useNavigation();
  return React.createElement(FormRow, {
    label: tabs.title(),
    leading: React.createElement(FormRow.Icon, { source: tabs.icon }),
    trailing: React.createElement(React.Fragment, {}, [
      tabs.trailing ? tabs.trailing() : null,
      React.createElement(FormRow.Arrow, { key: "arrow" }),
    ]),
    onPress: () => {
      navigation.navigate("VendettaCustomPage", {
        title: tabs.title(),
        render: () => React.createElement(tabs.page),
      });
    },
  });
}

function patchPanelUI(tabs, patches) {
  try {
    patches.push(after("default", bunny?.metro?.findByNameLazy?.("UserSettingsOverviewWrapper", false), (_, ret) => {
      const UserSettingsOverview = findInReactTree(ret.props.children, n => n.type?.name === "UserSettingsOverview");
      if (UserSettingsOverview) {
        patches.push(after("render", UserSettingsOverview.type.prototype, (_args, res) => {
          const sections = findInReactTree(res.props.children, n => n?.children?.[1]?.type === FormSection)?.children;
          if (sections) {
            const index = sections.findIndex(c => ["BILLING_SETTINGS", "PREMIUM_SETTINGS"].includes(c?.props?.label));
            sections.splice(-~index || 4, 0, React.createElement(Section, { key: tabs.key, tabs }));
          }
        }));
      }
    }, true));
  } catch (e) {
    try { logger.warn("[Proxifier] Panel UI patch failed:", e); } catch {}
  }
}

function patchTabsUI(tabs, patches) {
  if (!settingConstants || !SettingsOverviewScreen || !tabsNavigationRef) return;

  const row = {};
  row[tabs.key] = {
    type: "pressable",
    title: tabs.title,
    useTitle: tabs.title,
    icon: tabs.icon,
    IconComponent: tabs.icon && (() => React.createElement(TableRowIcon, { source: typeof tabs.icon === "object" && tabs.icon.uri !== undefined ? tabs.icon.uri : tabs.icon })),
    usePredicate: tabs.predicate,
    useTrailing: tabs.trailing,
    onPress: () => {
      const navigation = tabsNavigationRef.getRootNavigationRef();
      navigation.navigate("VendettaCustomPage", {
        title: tabs.title(),
        render: () => React.createElement(tabs.page),
      });
    },
    withArrow: true,
  };

  let rendererConfigValue = settingConstants.SETTING_RENDERER_CONFIG;
  Object.defineProperty(settingConstants, "SETTING_RENDERER_CONFIG", {
    enumerable: true, configurable: true,
    get: () => ({ ...rendererConfigValue, ...row }),
    set: v => (rendererConfigValue = v),
  });

  const firstRender = Symbol("Proxifier-pin");
  try {
    if (!createListModule) return;
    patches.push(after("createList", createListModule, (args, ret) => {
      if (!args[0][firstRender]) {
        args[0][firstRender] = true;
        const sections = args[0].sections;
        const section = sections?.find(x => ["Bunny", "Kettu", "Revenge"].includes(x?.label));
        if (!section) {
          const isMain = Boolean(sections?.find(x => x.settings.includes("ACCOUNT")));
          if (isMain) sections.unshift({ label: "Proxifier", title: "Proxifier", settings: [tabs.key] });
        }
        if (section?.settings) section.settings = [...section.settings, tabs.key];
      }
    }));
  } catch {
    patches.push(after("default", SettingsOverviewScreen, (args, ret) => {
      if (!args[0][firstRender]) {
        args[0][firstRender] = true;
        const { sections } = findInReactTree(ret, i => i.props?.sections).props;
        const section = sections?.find(x => ["Bunny", "Kettu", "Revenge"].includes(x?.label));
        if (!section) {
          const isMain = Boolean(sections?.find(x => x.settings.includes("ACCOUNT")));
          if (isMain) sections.unshift({ label: "Proxifier", title: "Proxifier", settings: [tabs.key] });
        }
        if (section?.settings) section.settings = [...section.settings, tabs.key];
      }
    }));
  }
}

export default function patchSidebar(testProxy) {
  const patches = [];
  let disabled = false;

  const tabs = {
    key: "Proxifier",
    icon: getAssetIDByName("ic_globe_24px") || getAssetIDByName("ic_link"),
    title: () => "Proxifier",
    predicate: () => !disabled,
    page: (props) => React.createElement(ProxifierPage, { ...props, storage, testProxy }),
    trailing: () => {
      // Small status dot next to the sidebar entry
      const active = storage.enabled && storage.proxyUrl;
      return React.createElement(
        ReactNative.View,
        {
          style: {
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: active ? "#43B581" : "#f04747",
            marginRight: 8, alignSelf: "center",
          }
        }
      );
    },
  };

  patchPanelUI(tabs, patches);
  patchTabsUI(tabs, patches);
  patches.push(() => { disabled = true; });

  return () => { for (const p of patches) { try { p(); } catch {} } };
}
