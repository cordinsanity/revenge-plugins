import { React, ReactNative } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { showToast } from "@vendetta/ui/toasts";
import { clipboard } from "@vendetta/metro/common";
import { findByProps, findByStoreName } from "@vendetta/metro";

import { addLog, getLogs, clearLogs } from "./Logger.js";
import { PasswordPrompt } from "./PassPrompt.js";
import { PinLock, isSessionUnlocked, setSessionUnlocked } from "./PinLock.js";
import {
  exportAccounts, importAccounts, setExportPassword,
  removeExportPassword, addAccountWithToken, addAccountWithCredentials,
  forceLogout, refreshAccountStatus
} from "./AccountActions.js";
import {
  generateEncryptionKey, encryptToken, decryptToken,
  getDecryptedToken, getEncryptedTokenData, encryptTokenWithSalt,
  generateAccountSalt, decryptTokenWithWipe
} from "./PasswordUtils.js";
import {
  authenticateWithBiometric, enableScreenshotProtection,
  disableScreenshotProtection, checkTokenExpiry, checkUnknownDevices
} from "./SecurityUtils.js";
import { addHistoryEntry, getHistory, clearHistory } from "./LoginHistory.js";

const UserStore = findByStoreName("UserStore");
const TokenManager = findByProps("getToken");

// Storage init
if (!storage.accounts) storage.accounts = {};
if (!storage.accountOrder) storage.accountOrder = [];
if (!storage.settings) {
  storage.settings = {
    enableCLI: true, confirmBeforeDelete: true,
    enableUnsafeFeatures: false, addToSidebar: true,
    enablePinLock: false, enableBiometric: false,
    enableScreenshotProtection: false, checkTokenExpiry: false,
    enableLoginHistory: false, enableFingerprintRandomizer: false,
    enablePerAccountSalt: false, enableMemoryWipe: false,
    enableUnknownDeviceWarning: false, enablePanicWipe: false,
  };
} else {
  const defaults = {
    enableUnsafeFeatures: false, enableCLI: true,
    confirmBeforeDelete: true, addToSidebar: true,
    enablePinLock: false, enableBiometric: false,
    enableScreenshotProtection: false, checkTokenExpiry: false,
    enableLoginHistory: false, enableFingerprintRandomizer: false,
    enablePerAccountSalt: false, enableMemoryWipe: false,
    enableUnknownDeviceWarning: false, enablePanicWipe: false,
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (storage.settings[k] === undefined) storage.settings[k] = v;
  }
  if (storage.settings.showAccountNames !== undefined) delete storage.settings.showAccountNames;
}

// Encrypt existing plaintext tokens on load
(async () => {
  try {
    if (!storage.settings.tokenEncryptionKey) {
      storage.settings.tokenEncryptionKey = await generateEncryptionKey();
    }
    const encKey = storage.settings.tokenEncryptionKey;
    for (const id of Object.keys(storage.accounts || {})) {
      const acc = storage.accounts[id];
      if (acc?.token && !acc.token.startsWith("enc:")) {
        if (storage.settings.enablePerAccountSalt && !acc.tokenSalt) {
          const salt = generateAccountSalt();
          storage.accounts[id] = { ...acc, token: await encryptTokenWithSalt(acc.token, encKey, salt), tokenSalt: salt };
        } else {
          storage.accounts[id] = { ...acc, token: await encryptToken(acc.token, encKey) };
        }
      }
    }
  } catch (e) { addLog('error', 'Migration failed', { error: e.message }); }
})();

addLog('info', 'AccountSwitcher initialized', {
  accountsCount: Object.keys(storage.accounts).length
});

// ─── Settings Page ──────────────────────────────────────────────────────────

// Nitro badge helper
const NITRO_LABELS = { 0: null, 1: 'Classic', 2: 'Nitro', 3: 'Basic' };
const NITRO_COLORS = { 0: null, 1: '#99aab5', 2: '#9b59b6', 3: '#7b5ea7' };

function NitroBadge({ type }) {
  if (!type) return null;
  return React.createElement(ReactNative.View, {
    style: {
      backgroundColor: NITRO_COLORS[type] || '#9b59b6',
      borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
      marginLeft: 6, alignSelf: 'center'
    }
  }, React.createElement(ReactNative.Text, {
    style: { color: 'white', fontSize: 10, fontWeight: 'bold' }
  }, `✦ ${NITRO_LABELS[type] || 'Nitro'}`));
}

function ToggleRow({ label, desc, value, onChange, color }) {
  return React.createElement(ReactNative.View, {
    style: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 12, backgroundColor: '#36393f',
      paddingHorizontal: 16, borderRadius: 8, marginBottom: 8
    }
  }, [
    React.createElement(ReactNative.View, { key: "text", style: { flex: 1, marginRight: 8 } }, [
      React.createElement(ReactNative.Text, { key: "l", style: { color: 'white', fontSize: 16 } }, label),
      desc && React.createElement(ReactNative.Text, { key: "d", style: { color: '#72767d', fontSize: 12, marginTop: 2 } }, desc),
    ]),
    React.createElement(ReactNative.Switch, {
      key: "sw",
      value: !!value,
      onValueChange: onChange,
      trackColor: { false: '#72767d', true: color || '#7289da' },
      thumbColor: 'white'
    })
  ]);
}

function SectionTitle({ label, color }) {
  return React.createElement(ReactNative.Text, {
    style: { color: color || '#b9bbbe', fontSize: 14, fontWeight: 'bold', marginBottom: 12, marginTop: 8 }
  }, label);
}

function ActionButton({ label, onPress, color, small }) {
  return React.createElement(ReactNative.TouchableOpacity, {
    onPress,
    style: {
      backgroundColor: color || '#7289da',
      paddingVertical: small ? 8 : 12,
      paddingHorizontal: small ? 12 : 16,
      borderRadius: 8, alignItems: 'center', marginBottom: 8
    }
  }, React.createElement(ReactNative.Text, {
    style: { color: 'white', fontSize: small ? 14 : 16, fontWeight: 'bold' }
  }, label));
}

function SettingsPage({ onBack }) {
  useProxy(storage);
  const [newToken, setNewToken] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);
  const [importText, setImportText] = React.useState("");
  const [showPasswordDialog, setShowPasswordDialog] = React.useState(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showHistory, setShowHistory] = React.useState(false);
  const [historyEntries, setHistoryEntries] = React.useState([]);
  const [showPinSetup, setShowPinSetup] = React.useState(false);
  const [checkingTokens, setCheckingTokens] = React.useState(false);

  const decryptFn = async (account) => getDecryptedToken(account, storage.settings);

  const updateSetting = (key, value) => {
    storage.settings = { ...storage.settings, [key]: value };
    addLog('info', `Setting updated: ${key}`, { value });
  };

  // Screenshot protection on/off
  const toggleScreenshot = (v) => {
    updateSetting('enableScreenshotProtection', v);
    if (v) enableScreenshotProtection();
    else disableScreenshotProtection();
  };

  // Per-account salt: migrate existing accounts when enabled
  const togglePerAccountSalt = async (v) => {
    if (v) {
      const encKey = storage.settings.tokenEncryptionKey;
      if (!encKey) return;
      for (const id of Object.keys(storage.accounts || {})) {
        const acc = storage.accounts[id];
        if (acc && !acc.tokenSalt) {
          const plain = await decryptFn(acc);
          const salt = generateAccountSalt();
          const token = await encryptTokenWithSalt(plain, encKey, salt);
          storage.accounts[id] = { ...acc, token, tokenSalt: salt };
        }
      }
      addLog('info', 'Per-account salt migration done');
      showToast("All tokens re-encrypted with per-account salt", 0);
    }
    updateSetting('enablePerAccountSalt', v);
  };

  // Biometric toggle — test availability first
  const toggleBiometric = async (v) => {
    if (v) {
      const result = await authenticateWithBiometric("Test biometric access");
      if (!result.success) {
        showToast(`Biometric not available: ${result.error}`, 1);
        return;
      }
    }
    updateSetting('enableBiometric', v);
  };

  // Check all stored tokens for expiry
  const checkAllTokens = async () => {
    setCheckingTokens(true);
    let valid = 0, expired = 0;
    for (const id of Object.keys(storage.accounts || {})) {
      const acc = storage.accounts[id];
      const plain = await decryptFn(acc);
      const result = await checkTokenExpiry(plain);
      if (result.valid) valid++;
      else {
        expired++;
        addLog('warn', 'Token expired', { username: acc.username });
      }
    }
    setCheckingTokens(false);
    showToast(`${valid} valid, ${expired} expired token(s)`, expired > 0 ? 1 : 0);
  };

  // Load history
  const loadHistory = async () => {
    const h = await getHistory();
    setHistoryEntries(h);
    setShowHistory(true);
  };

  if (showPinSetup) {
    return React.createElement(PinLock, {
      storage,
      mode: storage.settings.pinHash ? 'change' : 'setup',
      onSuccess: () => setShowPinSetup(false),
      onCancel: () => setShowPinSetup(false)
    });
  }

  if (showHistory) {
    return React.createElement(ReactNative.View, { style: { flex: 1, backgroundColor: '#2f3136' } }, [
      React.createElement(ReactNative.View, {
        key: "hdr",
        style: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#202225', borderBottomWidth: 1, borderBottomColor: '#40444b' }
      }, [
        React.createElement(ReactNative.TouchableOpacity, { key: "back", onPress: () => setShowHistory(false), style: { marginRight: 16 } },
          React.createElement(ReactNative.Text, { style: { color: '#7289da', fontSize: 16 } }, "← Back")),
        React.createElement(ReactNative.Text, { key: "t", style: { color: 'white', fontSize: 18, fontWeight: 'bold' } }, "Login History"),
        React.createElement(ReactNative.TouchableOpacity, {
          key: "clear", onPress: () => { clearHistory(); setHistoryEntries([]); showToast("History cleared", 0); },
          style: { marginLeft: 'auto', backgroundColor: '#f04747', padding: 8, borderRadius: 6 }
        }, React.createElement(ReactNative.Text, { style: { color: 'white', fontSize: 12 } }, "Clear"))
      ]),
      React.createElement(ReactNative.ScrollView, {
        key: "list", style: { flex: 1, padding: 16 }
      }, historyEntries.length === 0
        ? [React.createElement(ReactNative.Text, { key: "empty", style: { color: '#72767d', textAlign: 'center', marginTop: 40 } }, "No history yet")]
        : historyEntries.map((e, i) =>
          React.createElement(ReactNative.View, {
            key: i,
            style: { backgroundColor: '#36393f', borderRadius: 8, padding: 12, marginBottom: 8 }
          }, [
            React.createElement(ReactNative.Text, { key: "u", style: { color: 'white', fontWeight: 'bold' } }, e.username || "Unknown"),
            React.createElement(ReactNative.Text, { key: "a", style: { color: '#b9bbbe', fontSize: 12 } }, `Action: ${e.action}`),
            React.createElement(ReactNative.Text, { key: "t", style: { color: '#72767d', fontSize: 11 } }, new Date(e.timestamp).toLocaleString()),
          ])
        )
      )
    ]);
  }

  if (showPasswordDialog) {
    return React.createElement(PasswordPrompt, {
      dialogInfo: showPasswordDialog,
      onCancel: () => setShowPasswordDialog(null),
      onSuccess: () => { const cb = showPasswordDialog.callback; setShowPasswordDialog(null); cb(); },
      storage
    });
  }

  return React.createElement(ReactNative.View, { style: { flex: 1, backgroundColor: '#2f3136' } }, [
    React.createElement(ReactNative.View, {
      key: "hdr",
      style: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#202225', borderBottomWidth: 1, borderBottomColor: '#40444b' }
    }, [
      React.createElement(ReactNative.TouchableOpacity, { key: "back", onPress: onBack, style: { marginRight: 16 } },
        React.createElement(ReactNative.Text, { style: { color: '#7289da', fontSize: 16 } }, "← Back to Accounts")),
      React.createElement(ReactNative.Text, { key: "title", style: { color: 'white', fontSize: 18, fontWeight: 'bold' } }, "Settings")
    ]),

    React.createElement(ReactNative.ScrollView, {
      key: "scroll", style: { flex: 1, padding: 16 }, contentContainerStyle: { paddingBottom: 100 }
    }, [

      // ── Backup & Restore ──
      React.createElement(ReactNative.View, { key: "backup", style: { marginBottom: 24 } }, [
        React.createElement(SectionTitle, { key: "t", label: "BACKUP & RESTORE" }),
        React.createElement(ActionButton, { key: "exp", label: "📤 Export Accounts to Clipboard", onPress: () => exportAccounts(storage, setShowPasswordDialog, decryptFn) }),
        React.createElement(ReactNative.TextInput, {
          key: "imp-in",
          placeholder: "Paste exported data here (or leave empty for clipboard)...",
          placeholderTextColor: '#72767d', value: importText, onChangeText: setImportText,
          multiline: true, numberOfLines: 4,
          style: { backgroundColor: '#40444b', color: 'white', padding: 12, borderRadius: 8, marginBottom: 8, fontSize: 14, textAlignVertical: 'top' }
        }),
        React.createElement(ActionButton, { key: "imp", label: "📥 Import Accounts", color: '#43b581', onPress: () => importAccounts(storage, setShowPasswordDialog, importText) }),
        React.createElement(ActionButton, { key: "fl", label: "🚪 Force Logout", color: '#f04747', onPress: forceLogout }),
      ]),

      // ── Export Password ──
      React.createElement(ReactNative.View, { key: "pwd", style: { marginBottom: 24 } }, [
        React.createElement(SectionTitle, { key: "t", label: "EXPORT PASSWORD PROTECTION" }),
        storage.settings.exportPasswordHash
          ? React.createElement(ReactNative.View, { key: "set" }, [
              React.createElement(ReactNative.Text, { key: "s", style: { color: '#43b581', fontSize: 16, marginBottom: 12 } }, "✓ Export password is set"),
              React.createElement(ActionButton, { key: "rem", label: "Remove Password", color: '#f04747', onPress: () => removeExportPassword(storage, setShowPasswordDialog) }),
            ])
          : React.createElement(ReactNative.View, { key: "unset" }, [
              React.createElement(ReactNative.TextInput, { key: "np", placeholder: "New password", placeholderTextColor: '#72767d', value: newPassword, onChangeText: setNewPassword, secureTextEntry: true, style: { backgroundColor: '#40444b', color: 'white', padding: 12, borderRadius: 8, marginBottom: 8, fontSize: 14 } }),
              React.createElement(ReactNative.TextInput, { key: "cp", placeholder: "Confirm password", placeholderTextColor: '#72767d', value: confirmPassword, onChangeText: setConfirmPassword, secureTextEntry: true, style: { backgroundColor: '#40444b', color: 'white', padding: 12, borderRadius: 8, marginBottom: 8, fontSize: 14 } }),
              React.createElement(ActionButton, { key: "sp", label: "Set Password", onPress: () => setExportPassword(storage, newPassword, confirmPassword, setNewPassword, setConfirmPassword) }),
            ])
      ]),

      // ── Privacy & Security ──
      React.createElement(ReactNative.View, { key: "priv", style: { marginBottom: 24 } }, [
        React.createElement(SectionTitle, { key: "t", label: "🔒 PRIVACY & SECURITY", color: '#43b581' }),

        // PIN Lock
        React.createElement(ToggleRow, {
          key: "pin", label: "PIN Lock", color: '#43b581',
          desc: "Require a 4-digit PIN to open Account Switcher",
          value: storage.settings.enablePinLock,
          onChange: (v) => {
            if (v) setShowPinSetup(true);
            else {
              showConfirmationAlert({
                title: "Disable PIN Lock",
                content: "Remove PIN protection from Account Switcher?",
                confirmText: "Disable",
                cancelText: "Cancel",
                onConfirm: () => { updateSetting('enablePinLock', false); storage.settings.pinHash = null; }
              });
            }
          }
        }),

        storage.settings.enablePinLock && React.createElement(ActionButton, {
          key: "change-pin", label: "Change PIN", small: true,
          onPress: () => setShowPinSetup(true)
        }),

        // Panic Wipe (only shown with PIN enabled)
        storage.settings.enablePinLock && React.createElement(ToggleRow, {
          key: "panic", label: "Panic Wipe", color: '#f04747',
          desc: "Delete ALL accounts after 5 wrong PINs",
          value: storage.settings.enablePanicWipe,
          onChange: (v) => {
            if (v) {
              showConfirmationAlert({
                title: "⚠️ Enable Panic Wipe",
                content: "After 5 wrong PINs, ALL saved accounts will be permanently deleted. Are you sure?",
                confirmText: "Enable",
                cancelText: "Cancel",
                onConfirm: () => updateSetting('enablePanicWipe', true)
              });
            } else updateSetting('enablePanicWipe', false);
          }
        }),

        // Biometric
        React.createElement(ToggleRow, {
          key: "bio", label: "Biometric Auth", color: '#43b581',
          desc: "Use fingerprint/FaceID instead of PIN",
          value: storage.settings.enableBiometric,
          onChange: toggleBiometric
        }),

        // Screenshot Protection
        React.createElement(ToggleRow, {
          key: "ss", label: "Screenshot Protection", color: '#43b581',
          desc: "Prevent screenshots in Account Switcher (Android)",
          value: storage.settings.enableScreenshotProtection,
          onChange: toggleScreenshot
        }),

        // Token Expiry
        React.createElement(ToggleRow, {
          key: "te", label: "Token Expiry Check",
          desc: "Warn when a saved token is invalid/expired",
          value: storage.settings.checkTokenExpiry,
          onChange: (v) => updateSetting('checkTokenExpiry', v)
        }),
        storage.settings.checkTokenExpiry && React.createElement(ActionButton, {
          key: "check-now",
          label: checkingTokens ? "Checking..." : "Check All Tokens Now",
          small: true, onPress: checkAllTokens
        }),

        // Login History
        React.createElement(ToggleRow, {
          key: "lh", label: "Login History", color: '#43b581',
          desc: "Record account switches (encrypted, PIN-protected)",
          value: storage.settings.enableLoginHistory,
          onChange: (v) => updateSetting('enableLoginHistory', v)
        }),
        storage.settings.enableLoginHistory && React.createElement(ActionButton, {
          key: "view-hist", label: "📋 View Login History", small: true, onPress: loadHistory
        }),

        // Unknown Device Warning
        React.createElement(ToggleRow, {
          key: "udw", label: "Unknown Device Warning", color: '#f04747',
          desc: "Warn when a new session is detected on an account",
          value: storage.settings.enableUnknownDeviceWarning,
          onChange: (v) => updateSetting('enableUnknownDeviceWarning', v)
        }),

        // Fingerprint Randomizer
        React.createElement(ToggleRow, {
          key: "fr", label: "Request Fingerprint Randomizer",
          desc: "Randomize User-Agent and headers on login requests",
          value: storage.settings.enableFingerprintRandomizer,
          onChange: (v) => updateSetting('enableFingerprintRandomizer', v)
        }),

        // Per-Account Salt
        React.createElement(ToggleRow, {
          key: "pas", label: "Per-Account Encryption Salt", color: '#43b581',
          desc: "Each token uses its own unique encryption key (HKDF)",
          value: storage.settings.enablePerAccountSalt,
          onChange: togglePerAccountSalt
        }),

        // Memory Wipe
        React.createElement(ToggleRow, {
          key: "mw", label: "Memory Wipe after Token Use",
          desc: "Zero out decrypted token buffer after switch (best effort)",
          value: storage.settings.enableMemoryWipe,
          onChange: (v) => updateSetting('enableMemoryWipe', v)
        }),
      ]),

      // ── General ──
      React.createElement(ReactNative.View, { key: "gen", style: { marginBottom: 24 } }, [
        React.createElement(SectionTitle, { key: "t", label: "GENERAL" }),
        React.createElement(ToggleRow, { key: "cli", label: "Enable CLI Interface", value: storage.settings.enableCLI, onChange: (v) => updateSetting('enableCLI', v) }),
        React.createElement(ToggleRow, { key: "sb", label: "Add to Settings Sidebar", desc: "Restart app to apply", value: storage.settings.addToSidebar, onChange: (v) => { updateSetting('addToSidebar', v); showToast("Restart app to apply sidebar changes", 0); } }),
        React.createElement(ToggleRow, { key: "cd", label: "Confirm Before Delete", value: storage.settings.confirmBeforeDelete, onChange: (v) => updateSetting('confirmBeforeDelete', v) }),
      ]),

      // ── Unsafe Features ──
      React.createElement(ReactNative.View, { key: "unsafe", style: { marginBottom: 24 } }, [
        React.createElement(SectionTitle, { key: "t", label: "⚠️ UNSAFE FEATURES", color: '#f04747' }),
        React.createElement(ToggleRow, {
          key: "uf", label: "Enable Unsafe Features", color: '#f04747',
          desc: "Token copying, manual token adding, detailed logging",
          value: storage.settings.enableUnsafeFeatures,
          onChange: (v) => {
            if (v) {
              showConfirmationAlert({
                title: "⚠️ Enable Unsafe Features",
                content: "These features expose raw Discord tokens. Only enable if you understand the risks.",
                confirmText: "Enable",
                cancelText: "Cancel",
                onConfirm: () => updateSetting('enableUnsafeFeatures', true)
              });
            } else updateSetting('enableUnsafeFeatures', false);
          }
        }),

        storage.settings.enableUnsafeFeatures && React.createElement(ReactNative.View, { key: "uf-content" }, [
          React.createElement(ReactNative.View, {
            key: "log-btns",
            style: { flexDirection: 'row', gap: 8, marginBottom: 12 }
          }, [
            React.createElement(ReactNative.TouchableOpacity, {
              key: "copy-logs", onPress: () => { const logs = getLogs(); clipboard.setString(logs.map(l => `[${l.timestamp}] ${l.type.toUpperCase()}: ${l.message}`).join('\n')); showToast(`Copied ${logs.length} logs`, 0); },
              style: { flex: 1, backgroundColor: '#7289da', padding: 10, borderRadius: 6, alignItems: 'center' }
            }, React.createElement(ReactNative.Text, { style: { color: 'white', fontSize: 14, fontWeight: 'bold' } }, `Copy Logs (${getLogs().length})`)),
            React.createElement(ReactNative.TouchableOpacity, {
              key: "clr-logs", onPress: clearLogs,
              style: { flex: 1, backgroundColor: '#f04747', padding: 10, borderRadius: 6, alignItems: 'center' }
            }, React.createElement(ReactNative.Text, { style: { color: 'white', fontSize: 14, fontWeight: 'bold' } }, "Clear Logs")),
          ]),

          React.createElement(ReactNative.Text, { key: "tt", style: { color: '#b9bbbe', fontSize: 14, fontWeight: 'bold', marginBottom: 8 } }, "ADD ACCOUNT VIA TOKEN"),
          React.createElement(ReactNative.TextInput, {
            key: "ti",
            placeholder: "Paste token here (empty = add current account)...",
            placeholderTextColor: '#72767d', value: newToken, onChangeText: setNewToken,
            secureTextEntry: true,
            style: { backgroundColor: '#40444b', color: 'white', padding: 12, borderRadius: 8, marginBottom: 8, fontSize: 14 }
          }),
          React.createElement(ReactNative.TouchableOpacity, {
            key: "add-btn",
            onPress: () => addAccountWithToken(storage, newToken, setNewToken, setIsAdding),
            disabled: isAdding,
            style: { backgroundColor: isAdding ? '#5c6bc0' : '#7289da', padding: 12, borderRadius: 8, alignItems: 'center', opacity: isAdding ? 0.6 : 1 }
          }, React.createElement(ReactNative.Text, { style: { color: 'white', fontSize: 16, fontWeight: 'bold' } }, isAdding ? "Adding..." : (newToken.trim() ? "Add Account" : "Add Current Account"))),
        ])
      ])
    ])
  ]);
}

// ─── Main Account Manager ───────────────────────────────────────────────────

export default function AccountsManager(props) {
  useProxy(storage);

  const [pinUnlocked, setPinUnlocked] = React.useState(isSessionUnlocked());
  const [showSettings, setShowSettings] = React.useState(false);
  const [switchingTo, setSwitchingTo] = React.useState(null);
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isAddingDynamic, setIsAddingDynamic] = React.useState(false);
  const [refreshingId, setRefreshingId] = React.useState(null);

  const currentUserId = UserStore.getCurrentUser()?.id;

  // Screenshot protection on mount/unmount
  React.useEffect(() => {
    if (storage.settings?.enableScreenshotProtection) enableScreenshotProtection();
    return () => { if (storage.settings?.enableScreenshotProtection) disableScreenshotProtection(); };
  }, []);

  // Biometric — try once on mount, never call in render body
  const biometricTriedRef = React.useRef(false);
  React.useEffect(() => {
    if (storage.settings?.enablePinLock && !pinUnlocked && storage.settings?.enableBiometric && !biometricTriedRef.current) {
      biometricTriedRef.current = true;
      authenticateWithBiometric("Unlock Account Switcher").then(result => {
        if (result.success) { setSessionUnlocked(true); setPinUnlocked(true); }
      });
    }
  }, []);

  // PIN / Biometric gate
  if (storage.settings?.enablePinLock && !pinUnlocked) {
    return React.createElement(PinLock, {
      storage,
      mode: 'verify',
      onSuccess: () => { setPinUnlocked(true); },
      onCancel: null
    });
  }

  const decryptFn = async (account) => getDecryptedToken(account, storage.settings);

  const switchToAccount = async (accountId) => {
    const account = storage.accounts[accountId];
    if (!account) return;
    setSwitchingTo(accountId);
    addLog('info', 'Switching account', { username: account.username });

    try {
      showToast(`Switching to ${account.username}...`, 0);

      if (storage.settings?.enableMemoryWipe && storage.settings?.tokenEncryptionKey) {
        await decryptTokenWithWipe(
          account.token,
          storage.settings.tokenEncryptionKey,
          storage.settings.enablePerAccountSalt ? account.tokenSalt : null,
          async (token) => {
            await findByProps("login", "logout", "switchAccountToken").switchAccountToken(token);
          }
        );
      } else {
        const token = await decryptFn(account);
        await findByProps("login", "logout", "switchAccountToken").switchAccountToken(token);
      }

      // Unknown device check after switch
      if (storage.settings?.enableUnknownDeviceWarning) {
        const plain = await decryptFn(account);
        const unknown = await checkUnknownDevices(storage, plain);
        if (unknown?.length) showToast(`⚠️ ${unknown.length} unknown session(s) on this account!`, 1);
      }

      await addHistoryEntry({ action: 'switch', username: account.username, accountId });
      addLog('info', 'Switch successful', { username: account.username });
      showToast(`Switched to ${account.username}!`, 0);
    } catch (e) {
      addLog('error', 'Switch failed', { error: e.message });
      showToast(`Failed to switch: ${e.message}`, 1);
    }
    setSwitchingTo(null);
  };

  const copyToken = async (accountId) => {
    if (!storage.settings.enableUnsafeFeatures) return;
    const account = storage.accounts[accountId];
    if (!account) return;
    try {
      const token = await decryptFn(account);
      clipboard.setString(token);
      addLog('info', 'Token copied', { username: account.username });
      showToast(`Token for ${account.username} copied`, 0);
      // Auto-clear clipboard after 30s
      setTimeout(() => clipboard.setString(""), 30000);
    } catch (e) {
      showToast("Failed to copy token", 1);
    }
  };

  const removeAccount = async (accountId) => {
    const account = storage.accounts[accountId];
    if (!account) return;
    const isCurrent = accountId === currentUserId;
    const name = account.username;

    const deleteFromStorage = () => {
      delete storage.accounts[accountId];
      storage.accountOrder = storage.accountOrder.filter(id => id !== accountId);
      addHistoryEntry({ action: 'remove', username: name, accountId });
    };

    const removeOnly = () => { deleteFromStorage(); showToast(`${name} removed`, 0); };

    const logoutAndDelete = async () => {
      try {
        const currentToken = TokenManager.getToken();
        const token = await decryptFn(account);
        await findByProps("login", "logout", "switchAccountToken").switchAccountToken(token);
        await findByProps("login", "logout").logout();
        setTimeout(async () => {
          try { await findByProps("login", "logout", "switchAccountToken").switchAccountToken(currentToken); } catch (_) {}
        }, 100);
      } catch (e) { addLog('error', 'Logout failed', { error: e.message }); }
      deleteFromStorage();
      showToast(`${name} removed and logged out`, 0);
    };

    if (storage.settings.confirmBeforeDelete) {
      ReactNative.Alert.alert(
        isCurrent ? "Remove Current Account" : "Remove Account",
        isCurrent ? "Remove from switcher?" : `What to do with ${name}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove from switcher only", onPress: removeOnly },
          !isCurrent && { text: "Remove and logout", onPress: logoutAndDelete },
        ].filter(Boolean)
      );
    } else {
      isCurrent ? removeOnly() : logoutAndDelete();
    }
  };

  const addCurrentAccount = async () => {
    setIsAddingDynamic(true);
    try {
      const token = TokenManager.getToken();
      const user = UserStore.getCurrentUser();
      if (!user || storage.accounts[user.id]) {
        showToast(storage.accounts[user?.id] ? "Already saved" : "Failed to get user", 1);
        setIsAddingDynamic(false);
        return;
      }
      const encData = await getEncryptedTokenData(token, storage.settings);
      storage.accounts[user.id] = {
        id: user.id, username: user.username, discriminator: user.discriminator,
        avatar: user.avatar, displayName: user.globalName || user.username,
        addedAt: Date.now(), ...encData
      };
      if (!storage.accountOrder.includes(user.id)) storage.accountOrder.push(user.id);
      await addHistoryEntry({ action: 'add', username: user.username, accountId: user.id });
      setShowAddDialog(false);
      showToast(`${user.username} added!`, 0);
    } catch (e) {
      addLog('error', 'Add current account failed', { error: e.message });
      showToast("Failed to add account", 1);
    }
    setIsAddingDynamic(false);
  };

  // Move account up/down in order
  const moveAccount = (accountId, direction) => {
    const idx = storage.accountOrder.indexOf(accountId);
    if (idx === -1) return;
    const newOrder = [...storage.accountOrder];
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    storage.accountOrder = newOrder;
  };

  const formatDate = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const orderedAccounts = storage.accountOrder.filter(id => storage.accounts[id]).map(id => storage.accounts[id]);

  if (showSettings) return React.createElement(SettingsPage, { onBack: () => setShowSettings(false) });

  if (showAddDialog) {
    return React.createElement(ReactNative.View, { style: { flex: 1, backgroundColor: '#2f3136' } }, [
      React.createElement(ReactNative.View, { key: "hdr", style: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#202225', borderBottomWidth: 1, borderBottomColor: '#40444b' } }, [
        React.createElement(ReactNative.TouchableOpacity, { key: "back", onPress: () => { setShowAddDialog(false); setEmail(""); setPassword(""); }, style: { marginRight: 16 } },
          React.createElement(ReactNative.Text, { style: { color: '#7289da', fontSize: 16 } }, "← Back")),
        React.createElement(ReactNative.Text, { key: "t", style: { color: 'white', fontSize: 18, fontWeight: 'bold' } }, "Add Account")
      ]),
      React.createElement(ReactNative.ScrollView, { key: "c", style: { flex: 1 }, contentContainerStyle: { padding: 16, paddingBottom: 100 } }, [
        React.createElement(ReactNative.Text, { key: "i", style: { color: '#b9bbbe', fontSize: 16, marginBottom: 20, textAlign: 'center' } }, "Enter Discord credentials or add current account"),
        React.createElement(ReactNative.TextInput, { key: "em", placeholder: "Email address", placeholderTextColor: '#72767d', value: email, onChangeText: setEmail, keyboardType: "email-address", autoCapitalize: "none", style: { backgroundColor: '#40444b', color: 'white', padding: 16, borderRadius: 8, marginBottom: 12, fontSize: 16 } }),
        React.createElement(ReactNative.TextInput, { key: "pw", placeholder: "Password", placeholderTextColor: '#72767d', value: password, onChangeText: setPassword, secureTextEntry: true, style: { backgroundColor: '#40444b', color: 'white', padding: 16, borderRadius: 8, marginBottom: 20, fontSize: 16 } }),
        React.createElement(ReactNative.TouchableOpacity, {
          key: "login", onPress: () => addAccountWithCredentials(storage, email, password, setEmail, setPassword, setShowAddDialog, setIsAddingDynamic),
          disabled: isAddingDynamic,
          style: { backgroundColor: isAddingDynamic ? '#5c6bc0' : '#7289da', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 12, opacity: isAddingDynamic ? 0.6 : 1 }
        }, React.createElement(ReactNative.Text, { style: { color: 'white', fontSize: 18, fontWeight: 'bold' } }, isAddingDynamic ? "Adding..." : "Add with Email & Password")),
        React.createElement(ReactNative.View, { key: "div", style: { height: 1, backgroundColor: '#40444b', marginVertical: 16 } }),
        React.createElement(ReactNative.TouchableOpacity, {
          key: "cur", onPress: addCurrentAccount, disabled: isAddingDynamic,
          style: { backgroundColor: isAddingDynamic ? '#5c6bc0' : '#43b581', padding: 16, borderRadius: 8, alignItems: 'center', opacity: isAddingDynamic ? 0.6 : 1 }
        }, React.createElement(ReactNative.Text, { style: { color: 'white', fontSize: 18, fontWeight: 'bold' } }, isAddingDynamic ? "Adding..." : "Add Current Account"))
      ])
    ]);
  }

  // Main account list
  return React.createElement(ReactNative.View, { style: { flex: 1, backgroundColor: '#2f3136' } }, [
    // Header
    React.createElement(ReactNative.View, {
      key: "hdr",
      style: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#202225', borderBottomWidth: 1, borderBottomColor: '#40444b' }
    }, [
      React.createElement(ReactNative.View, { key: "left" }, [
        React.createElement(ReactNative.Text, { key: "t", style: { color: 'white', fontSize: 20, fontWeight: 'bold' } }, "Account Switcher"),
        React.createElement(ReactNative.Text, { key: "sub", style: { color: '#72767d', fontSize: 12 } }, `${orderedAccounts.length} account${orderedAccounts.length !== 1 ? 's' : ''} saved`),
      ]),
      React.createElement(ReactNative.TouchableOpacity, {
        key: "cfg", onPress: () => setShowSettings(true),
        style: { padding: 10, borderRadius: 10, backgroundColor: '#36393f' }
      }, React.createElement(ReactNative.Text, { style: { fontSize: 18 } }, "⚙️"))
    ]),

    React.createElement(ReactNative.View, { key: "list", style: { flex: 1, paddingHorizontal: 12, paddingTop: 12 } }, [

      orderedAccounts.length === 0
        ? React.createElement(ReactNative.View, { key: "empty", style: { alignItems: 'center', paddingVertical: 60 } }, [
            React.createElement(ReactNative.Text, { key: "icon", style: { fontSize: 48, marginBottom: 16 } }, "👤"),
            React.createElement(ReactNative.Text, { key: "e1", style: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 8 } }, "No accounts yet"),
            React.createElement(ReactNative.Text, { key: "e2", style: { color: '#72767d', fontSize: 14, textAlign: 'center' } }, "Tap + below to save your first account")
          ])
        : React.createElement(ReactNative.ScrollView, { key: "scroll", style: { flex: 1 }, contentContainerStyle: { paddingBottom: 100 } },
            orderedAccounts.map((account, index) => {
              const isCurrent = account.id === currentUserId;
              const isSwitching = switchingTo === account.id;
              const isRefreshing = refreshingId === account.id;
              const nitro = account.premiumType ?? 0;
              const accentColor = isCurrent ? '#7289da' : nitro ? (NITRO_COLORS[nitro] || '#9b59b6') : '#4f545c';
              const avatarUrl = account.avatar
                ? `https://cdn.discordapp.com/avatars/${account.id}/${account.avatar}.png?size=80`
                : `https://cdn.discordapp.com/embed/avatars/${parseInt(account.id) % 5}.png`;
              const displayName = storage.settings.enableCLI
                ? `${account.username}${account.discriminator && account.discriminator !== "0" ? `#${account.discriminator}` : ''}`
                : (account.displayName || account.username);

              return React.createElement(ReactNative.View, {
                key: account.id,
                style: {
                  backgroundColor: '#36393f',
                  borderRadius: 14,
                  marginBottom: 12,
                  overflow: 'hidden',
                  // Colored left accent bar via borderLeft
                  borderLeftWidth: 4,
                  borderLeftColor: accentColor,
                  elevation: 2,
                }
              }, [
                // Top row: reorder + avatar + info + switch button
                React.createElement(ReactNative.View, {
                  key: "top",
                  style: { flexDirection: 'row', alignItems: 'center', padding: 12 }
                }, [
                  // Reorder arrows
                  React.createElement(ReactNative.View, {
                    key: "ord",
                    style: { flexDirection: 'column', alignItems: 'center', marginRight: 8 }
                  }, [
                    React.createElement(ReactNative.TouchableOpacity, {
                      key: "up", onPress: () => moveAccount(account.id, -1),
                      disabled: index === 0,
                      style: { paddingVertical: 4, opacity: index === 0 ? 0.2 : 0.7 }
                    }, React.createElement(ReactNative.Text, { style: { color: '#b9bbbe', fontSize: 12 } }, "▲")),
                    React.createElement(ReactNative.Text, {
                      key: "num",
                      style: { color: '#4f545c', fontSize: 10, fontWeight: 'bold', marginVertical: 2 }
                    }, `${index + 1}`),
                    React.createElement(ReactNative.TouchableOpacity, {
                      key: "dn", onPress: () => moveAccount(account.id, 1),
                      disabled: index === orderedAccounts.length - 1,
                      style: { paddingVertical: 4, opacity: index === orderedAccounts.length - 1 ? 0.2 : 0.7 }
                    }, React.createElement(ReactNative.Text, { style: { color: '#b9bbbe', fontSize: 12 } }, "▼")),
                  ]),

                  // Avatar with colored ring
                  React.createElement(ReactNative.TouchableOpacity, {
                    key: "av",
                    onPress: () => switchToAccount(account.id),
                    disabled: isCurrent || isSwitching,
                    style: {
                      marginRight: 12,
                      padding: 2,
                      borderRadius: 28,
                      borderWidth: 2,
                      borderColor: isSwitching ? '#faa61a' : accentColor,
                    }
                  }, React.createElement(ReactNative.Image, {
                    source: { uri: avatarUrl },
                    style: {
                      width: 44, height: 44, borderRadius: 22,
                      opacity: isSwitching ? 0.6 : 1
                    }
                  })),

                  // Name + badge + status
                  React.createElement(ReactNative.View, { key: "info", style: { flex: 1 } }, [
                    React.createElement(ReactNative.View, {
                      key: "nameline",
                      style: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }
                    }, [
                      React.createElement(ReactNative.Text, {
                        key: "name",
                        style: { color: 'white', fontSize: 15, fontWeight: 'bold' },
                        numberOfLines: 1
                      }, displayName),
                      React.createElement(NitroBadge, { key: "badge", type: nitro }),
                      isCurrent && React.createElement(ReactNative.View, {
                        key: "cur-badge",
                        style: { backgroundColor: '#43b581', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, marginLeft: 6 }
                      }, React.createElement(ReactNative.Text, { style: { color: 'white', fontSize: 9, fontWeight: 'bold' } }, "ACTIVE")),
                    ]),
                    React.createElement(ReactNative.Text, {
                      key: "status",
                      style: {
                        color: isSwitching ? '#faa61a' : isCurrent ? '#43b581' : '#72767d',
                        fontSize: 12, marginTop: 3
                      }
                    }, isSwitching ? "⟳ Switching..." : isCurrent ? "Currently logged in" : "Tap avatar to switch"),
                    React.createElement(ReactNative.Text, {
                      key: "date",
                      style: { color: '#4f545c', fontSize: 10, marginTop: 2 }
                    }, `Added ${formatDate(account.addedAt || Date.now())}${account.tokenSalt ? ' · 🔑' : ''}`),
                  ]),
                ]),

                // Bottom action bar
                React.createElement(ReactNative.View, {
                  key: "actions",
                  style: {
                    flexDirection: 'row',
                    borderTopWidth: 1,
                    borderTopColor: '#2f3136',
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    gap: 6,
                  }
                }, [
                  // Refresh button
                  React.createElement(ReactNative.TouchableOpacity, {
                    key: "ref",
                    onPress: async () => {
                      setRefreshingId(account.id);
                      const updated = await refreshAccountStatus(storage, account.id, decryptFn);
                      setRefreshingId(null);
                      showToast(updated ? `Updated ${updated.username}` : "Refresh failed", updated ? 0 : 1);
                    },
                    disabled: isRefreshing,
                    style: {
                      flex: 1, paddingVertical: 7, borderRadius: 8,
                      backgroundColor: '#2f3136', alignItems: 'center',
                      opacity: isRefreshing ? 0.5 : 1
                    }
                  }, React.createElement(ReactNative.Text, {
                    style: { color: '#b9bbbe', fontSize: 12 }
                  }, isRefreshing ? "⟳ Checking..." : "⟳ Refresh")),

                  // Copy Token (unsafe only)
                  storage.settings.enableUnsafeFeatures && React.createElement(ReactNative.TouchableOpacity, {
                    key: "cp",
                    onPress: () => copyToken(account.id),
                    style: { flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: '#4f545c', alignItems: 'center' }
                  }, React.createElement(ReactNative.Text, {
                    style: { color: '#dcddde', fontSize: 12, fontWeight: '600' }
                  }, "🔑 Copy Token")),

                  // Remove
                  React.createElement(ReactNative.TouchableOpacity, {
                    key: "rm",
                    onPress: () => removeAccount(account.id),
                    style: { flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: '#f04747', alignItems: 'center' }
                  }, React.createElement(ReactNative.Text, {
                    style: { color: 'white', fontSize: 12, fontWeight: '600' }
                  }, "✕ Remove")),
                ]),
              ]);
            })
          )
    ]),

    React.createElement(ReactNative.View, {
      key: "footer",
      style: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#202225', borderTopWidth: 1, borderTopColor: '#40444b', paddingVertical: 12, paddingHorizontal: 16, paddingBottom: 40 }
    }, React.createElement(ReactNative.TouchableOpacity, {
      onPress: () => setShowAddDialog(true),
      style: { backgroundColor: '#7289da', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }
    }, [
      React.createElement(ReactNative.Text, { key: "i", style: { color: 'white', fontSize: 20, marginRight: 8 } }, "+"),
      React.createElement(ReactNative.Text, { key: "t", style: { color: 'white', fontSize: 18, fontWeight: 'bold' } }, "Add Account")
    ]))
  ]);
}

export { addLog };
