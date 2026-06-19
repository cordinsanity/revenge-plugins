import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { showToast } from "@vendetta/ui/toasts";
import { clipboard } from "@vendetta/metro/common";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { addLog } from "./Logger.js";
import { hashPassword, getEncryptedTokenData } from "./PasswordUtils.js";
import { getRandomizedHeaders, checkUnknownDevices } from "./SecurityUtils.js";
import { addHistoryEntry } from "./LoginHistory.js";

const UserStore = findByStoreName("UserStore");
const TokenManager = findByProps("getToken");

const exportAccounts = async (storage, showPasswordDialog, decryptFn) => {
  const checkPassword = (callback) => {
    if (storage.settings?.exportPasswordHash) {
      showPasswordDialog({
        type: 'export',
        title: 'Enter Export Password',
        message: 'Enter your password to export accounts',
        callback
      });
    } else {
      callback();
    }
  };

  checkPassword(() => {
    showConfirmationAlert({
      title: "⚠️ Export Accounts - Security Warning",
      content: "Exporting accounts is UNSAFE and may lead to account takeover if shared with others.",
      confirmText: "I Understand - Export",
      cancelText: "Cancel",
      confirmColor: "brand",
      onConfirm: async () => {
        try {
          addLog('info', 'Starting account export');
          const accounts = storage.accounts || {};

          const accountData = await Promise.all(
            Object.values(accounts).map(async account => {
              const token = await decryptFn(account);
              return {
                username: account.username,
                discriminator: account.discriminator,
                avatar: account.avatar,
                id: account.id,
                token,
                addedAt: account.addedAt || Date.now()
              };
            })
          );

          const exportData = {
            accounts: accountData,
            exportPasswordHash: storage.settings?.exportPasswordHash || null,
            exportedAt: Date.now(),
            version: "2.0"
          };

          clipboard.setString(JSON.stringify(exportData, null, 2));
          addLog('info', 'Accounts exported', { count: accountData.length });
          showToast(`Exported ${accountData.length} accounts to clipboard`, 0);
        } catch (e) {
          addLog('error', 'Export failed', { error: e.message });
          showToast("Failed to export accounts", 1);
        }
      }
    });
  });
};

const importAccounts = async (storage, showPasswordDialog, importText) => {
  const checkPassword = (callback) => {
    if (storage.settings?.exportPasswordHash) {
      showPasswordDialog({
        type: 'import',
        title: 'Enter Import Password',
        message: 'Enter your password to import accounts',
        callback
      });
    } else {
      callback();
    }
  };

  checkPassword(() => {
    showConfirmationAlert({
      title: "⚠️ Import Accounts - Security Warning",
      content: "Only import data from sources you completely trust.",
      confirmText: "I Understand - Import",
      cancelText: "Cancel",
      confirmColor: "brand",
      onConfirm: async () => {
        try {
          addLog('info', 'Starting account import');
          let dataToImport = importText.trim();
          if (!dataToImport) {
            try { dataToImport = await clipboard.getString(); } catch (_) {}
          }
          if (!dataToImport) { showToast("No data to import", 1); return; }

          const importData = JSON.parse(dataToImport);
          let accountsArray;

          if (importData.accounts && Array.isArray(importData.accounts)) {
            if (importData.exportPasswordHash) {
              if (!storage.settings?.exportPasswordHash || storage.settings.exportPasswordHash !== importData.exportPasswordHash) {
                showToast("Import password mismatch", 1);
                return;
              }
            }
            accountsArray = importData.accounts;
          } else if (Array.isArray(importData)) {
            accountsArray = importData;
          } else {
            showToast("Invalid import format", 1);
            return;
          }

          let imported = 0, skipped = 0;
          for (const d of accountsArray) {
            if (d.id && d.token && d.username) {
              if (!storage.accounts[d.id]) {
                const encData = await getEncryptedTokenData(d.token, storage.settings);
                storage.accounts[d.id] = {
                  id: d.id,
                  username: d.username,
                  discriminator: d.discriminator || "0",
                  avatar: d.avatar || null,
                  displayName: d.displayName || d.username,
                  addedAt: d.addedAt || Date.now(),
                  ...encData
                };
                if (!storage.accountOrder.includes(d.id)) storage.accountOrder.push(d.id);
                imported++;
              } else {
                skipped++;
              }
            }
          }

          addLog('info', 'Import done', { imported, skipped });
          showToast(`Imported ${imported}, skipped ${skipped} duplicates`, 0);
        } catch (e) {
          addLog('error', 'Import failed', { error: e.message });
          showToast("Failed to import — invalid format", 1);
        }
      }
    });
  });
};

const setExportPassword = async (storage, newPassword, confirmPassword, setNewPassword, setConfirmPassword) => {
  if (!newPassword.trim()) { showToast("Please enter a password", 1); return; }
  if (newPassword !== confirmPassword) { showToast("Passwords don't match", 1); return; }
  try {
    storage.settings.exportPasswordHash = await hashPassword(newPassword);
    setNewPassword("");
    setConfirmPassword("");
    addLog('info', 'Export password set');
    showToast("Export password set", 0);
  } catch (e) {
    showToast("Failed to set password", 1);
  }
};

const removeExportPassword = (storage, showPasswordDialog) => {
  showPasswordDialog({
    type: 'remove',
    title: 'Enter Password to Remove',
    message: 'Enter your current password to remove protection',
    callback: () => {
      showConfirmationAlert({
        title: "Remove Export Password",
        content: "Are you sure? Exports will no longer be password protected.",
        confirmText: "Remove Password",
        cancelText: "Cancel",
        confirmColor: "brand",
        onConfirm: () => {
          delete storage.settings.exportPasswordHash;
          addLog('info', 'Export password removed');
          showToast("Export password removed", 0);
        }
      });
    }
  });
};

const addAccountWithToken = async (storage, newToken, setNewToken, setIsAdding) => {
  if (!storage.settings.enableUnsafeFeatures) return;
  setIsAdding(true);
  addLog('info', 'Adding account via token');
  try {
    let token = newToken.trim() || TokenManager.getToken();
    if (!token.startsWith("Bot ") && !token.match(/^[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}$/)) {
      showToast("Invalid token format", 1);
      setIsAdding(false);
      return;
    }
    const response = await fetch("https://discord.com/api/v9/users/@me", {
      headers: { "Authorization": token, "Content-Type": "application/json" }
    });
    if (!response.ok) { showToast("Invalid or expired token", 1); setIsAdding(false); return; }
    const user = await response.json();
    if (storage.accounts[user.id]) { showToast(`${user.username} already saved`, 1); setIsAdding(false); return; }

    const encData = await getEncryptedTokenData(token, storage.settings);
    storage.accounts[user.id] = {
      id: user.id, username: user.username, discriminator: user.discriminator,
      avatar: user.avatar, displayName: user.global_name || user.username,
      premiumType: user.premium_type ?? 0,
      addedAt: Date.now(), ...encData
    };
    if (!storage.accountOrder.includes(user.id)) storage.accountOrder.push(user.id);
    await addHistoryEntry({ action: 'add', username: user.username, accountId: user.id });
    setNewToken("");
    showToast(`Account ${user.username} added!`, 0);
  } catch (e) {
    addLog('error', 'Token add failed', { error: e.message });
    showToast("Failed to add account", 1);
  }
  setIsAdding(false);
};

const forceLogout = async () => {
  showConfirmationAlert({
    title: "Force Logout",
    content: "This will logout your current session. Your saved accounts remain intact.",
    confirmText: "Force Logout",
    cancelText: "Cancel",
    confirmColor: "brand",
    onConfirm: async () => {
      try {
        // Intentionally invalid token to force a logout — not a real token
        const fakeToken = ["INVALID", "LOGOUT", "TOKEN"].join(".");
        await findByProps("login", "logout", "switchAccountToken").switchAccountToken(fakeToken);
        showToast("Force logout successful", 0);
      } catch (e) {
        showToast("Force logout completed", 0);
      }
    }
  });
};

const addAccountWithCredentials = async (storage, email, password, setEmail, setPassword, setShowAddDialog, setIsAddingDynamic) => {
  if (!email.trim() || !password.trim()) { showToast("Please enter email and password", 1); return; }
  setIsAddingDynamic(true);
  addLog('info', 'Starting credential login', { email: email.trim() });

  try {
    const headers = getRandomizedHeaders(storage);
    const response = await fetch("https://discord.com/api/v9/auth/login", {
      method: "POST",
      headers,
      body: JSON.stringify({ login: email.trim(), password: password.trim() })
    });

    const loginData = await response.json();
    if (!response.ok || !loginData.token) {
      let msg = "Login failed";
      if (loginData.captcha_key) msg = "Captcha required — login through Discord first";
      else if (loginData.message?.toLowerCase().includes('mfa')) msg = "2FA not supported via credentials";
      else if (response.status === 429) msg = "Rate limited — wait and try again";
      else if (response.status >= 500) msg = "Discord servers having issues";
      else if (loginData.message) msg = loginData.message;
      showToast(msg, 1);
      addLog('error', 'Login failed', { status: response.status, msg });
      setIsAddingDynamic(false);
      return;
    }

    const userRes = await fetch("https://discord.com/api/v9/users/@me", {
      headers: { Authorization: loginData.token }
    });
    if (!userRes.ok) { showToast("Login ok but failed to get user info", 1); setIsAddingDynamic(false); return; }
    const user = await userRes.json();

    if (storage.accounts[user.id]) { showToast(`${user.username} already saved`, 1); setIsAddingDynamic(false); return; }

    // Check for unknown devices/sessions
    const unknown = await checkUnknownDevices(storage, loginData.token);
    if (unknown?.length) {
      showToast(`⚠️ ${unknown.length} unknown session(s) detected on this account!`, 1);
      addLog('warn', 'Unknown sessions on added account', { sessions: unknown });
    }

    const encData = await getEncryptedTokenData(loginData.token, storage.settings);
    storage.accounts[user.id] = {
      id: user.id, username: user.username, discriminator: user.discriminator,
      avatar: user.avatar, displayName: user.global_name || user.username,
      premiumType: user.premium_type ?? 0,
      addedAt: Date.now(), ...encData
    };
    if (!storage.accountOrder.includes(user.id)) storage.accountOrder.push(user.id);

    await addHistoryEntry({ action: 'add', username: user.username, accountId: user.id });
    setEmail(""); setPassword(""); setShowAddDialog(false);
    addLog('info', 'Account added via credentials', { username: user.username });
    showToast(`Account ${user.username} added!`, 0);
  } catch (e) {
    addLog('error', 'Credential login error', { error: e.message });
    showToast("Login failed — check logs", 1);
  }
  setIsAddingDynamic(false);
};

// Fetches fresh user info (premium_type, avatar, displayName) for one account
const refreshAccountStatus = async (storage, accountId, decryptFn) => {
  const account = storage.accounts[accountId];
  if (!account) return null;
  try {
    const token = await decryptFn(account);
    const res = await fetch("https://discord.com/api/v9/users/@me", {
      headers: { Authorization: token }
    });
    if (!res.ok) return null;
    const user = await res.json();
    storage.accounts[accountId] = {
      ...account,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      displayName: user.global_name || user.username,
      premiumType: user.premium_type ?? 0,
      // Keep existing token/tokenSalt
    };
    addLog('info', 'Account status refreshed', { username: user.username, premium: user.premium_type });
    return storage.accounts[accountId];
  } catch (e) {
    addLog('error', 'Status refresh failed', { error: e.message });
    return null;
  }
};

const loginWithToken = async (storage, token, setToken, setIsLoggingIn) => {
  if (!storage.settings.enableUnsafeFeatures) return;
  const trimmed = token.trim();
  if (!trimmed) { showToast("Paste a token first", 1); return; }
  if (!trimmed.startsWith("Bot ") && !trimmed.match(/^[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}$/)) {
    showToast("Invalid token format", 1);
    return;
  }
  setIsLoggingIn(true);
  addLog('info', 'Logging in via pasted token');
  try {
    const response = await fetch("https://discord.com/api/v9/users/@me", {
      headers: { "Authorization": trimmed, "Content-Type": "application/json" }
    });
    if (!response.ok) { showToast("Invalid or expired token", 1); setIsLoggingIn(false); return; }
    const user = await response.json();
    await findByProps("login", "logout", "switchAccountToken").switchAccountToken(trimmed);
    await addHistoryEntry({ action: 'switch', username: user.username, accountId: user.id });
    setToken("");
    showToast(`Logged in as ${user.username}!`, 0);
  } catch (e) {
    addLog('error', 'Token login failed', { error: e.message });
    showToast("Failed to login with token", 1);
  }
  setIsLoggingIn(false);
};

export {
  exportAccounts,
  importAccounts,
  setExportPassword,
  removeExportPassword,
  addAccountWithToken,
  addAccountWithCredentials,
  loginWithToken,
  forceLogout,
  refreshAccountStatus,
};
