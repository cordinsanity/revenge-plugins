import { React, ReactNative } from "@vendetta/metro/common";
import { showToast } from "@vendetta/ui/toasts";
import { verifyPassword, hashPassword } from "./PasswordUtils.js";
import { addLog } from "./Logger.js";

// Session-level unlock state — resets on app restart
let _sessionUnlocked = false;
export const isSessionUnlocked = () => _sessionUnlocked;
export const setSessionUnlocked = (v) => { _sessionUnlocked = v; };

function PinDots({ count }) {
  return React.createElement(ReactNative.View, {
    style: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 48 }
  }, [0, 1, 2, 3].map(i =>
    React.createElement(ReactNative.View, {
      key: i,
      style: {
        width: 16, height: 16, borderRadius: 8,
        backgroundColor: i < count ? '#7289da' : '#4f545c'
      }
    })
  ));
}

function NumPad({ onDigit, onBack, disabled }) {
  const rows = [[1, 2, 3], [4, 5, 6], [7, 8, 9], ['', 0, '⌫']];
  return React.createElement(ReactNative.View, null,
    rows.map((row, ri) =>
      React.createElement(ReactNative.View, {
        key: ri,
        style: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 16 }
      }, row.map((key, ki) =>
        React.createElement(ReactNative.TouchableOpacity, {
          key: ki,
          onPress: () => key === '⌫' ? onBack() : key !== '' ? onDigit(String(key)) : null,
          disabled: disabled || key === '',
          style: {
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: key === '' ? 'transparent' : '#36393f',
            justifyContent: 'center', alignItems: 'center',
            opacity: disabled ? 0.4 : 1
          }
        }, React.createElement(ReactNative.Text, {
          style: { color: 'white', fontSize: 24, fontWeight: 'bold' }
        }, String(key)))
      ))
    )
  );
}

// mode: 'verify' | 'setup' | 'change'
function PinLock({ storage, onSuccess, onCancel, mode = 'verify' }) {
  const [pin, setPin] = React.useState('');
  const [confirmPin, setConfirmPin] = React.useState('');
  const [phase, setPhase] = React.useState('enter'); // 'enter' | 'confirm'
  const [attempts, setAttempts] = React.useState(0);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const currentPin = phase === 'confirm' ? confirmPin : pin;
  const setCurrentPin = phase === 'confirm' ? setConfirmPin : setPin;

  const handleDigit = (d) => {
    if (cooldown > 0 || currentPin.length >= 4) return;
    setCurrentPin(prev => prev + d);
  };

  const handleBack = () => setCurrentPin(prev => prev.slice(0, -1));

  // Auto-submit when 4 digits entered — use separate effects to avoid double-fire
  React.useEffect(() => {
    if (phase === 'enter' && pin.length === 4) submit(pin);
  }, [pin]);

  React.useEffect(() => {
    if (phase === 'confirm' && confirmPin.length === 4) submit(confirmPin);
  }, [confirmPin]);

  const submit = async (entered) => {
    if (mode === 'verify') {
      const ok = await verifyPassword(entered, storage.settings.pinHash);
      if (ok) {
        _sessionUnlocked = true;
        addLog('info', 'PIN unlocked successfully');
        onSuccess();
      } else {
        const next = attempts + 1;
        setAttempts(next);
        setPin('');

        if (next >= 5 && storage.settings.enablePanicWipe) {
          storage.accounts = {};
          storage.accountOrder = [];
          storage.loginHistory = [];
          addLog('warn', 'Panic wipe: 5 failed PIN attempts');
          showToast("5 failed attempts — all accounts deleted", 1);
          onCancel?.();
          return;
        }
        if (next >= 3) {
          setCooldown(30);
          showToast(`Wrong PIN — wait 30s (${5 - next} attempts left)`, 1);
        } else {
          showToast(`Wrong PIN (${5 - next} attempts left)`, 1);
        }
      }
    } else {
      // setup / change
      if (phase === 'enter') {
        setPhase('confirm');
      } else {
        if (pin === confirmPin) {
          const hash = await hashPassword(pin);
          storage.settings.pinHash = hash;
          storage.settings.enablePinLock = true;
          _sessionUnlocked = true;
          addLog('info', 'PIN set');
          showToast("PIN set successfully", 0);
          onSuccess();
        } else {
          showToast("PINs don't match — try again", 1);
          setPin('');
          setConfirmPin('');
          setPhase('enter');
        }
      }
    }
  };

  const title = mode === 'setup'
    ? (phase === 'enter' ? 'Set PIN' : 'Confirm PIN')
    : mode === 'change'
      ? (phase === 'enter' ? 'New PIN' : 'Confirm New PIN')
      : 'Enter PIN';

  return React.createElement(ReactNative.View, {
    style: { flex: 1, backgroundColor: '#2f3136', justifyContent: 'center', padding: 32 }
  }, [
    onCancel && React.createElement(ReactNative.TouchableOpacity, {
      key: "cancel",
      onPress: onCancel,
      style: { position: 'absolute', top: 48, left: 16, padding: 8 }
    }, React.createElement(ReactNative.Text, {
      style: { color: '#7289da', fontSize: 16 }
    }, "Cancel")),

    React.createElement(ReactNative.Text, {
      key: "title",
      style: { color: 'white', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }
    }, "Account Switcher"),

    React.createElement(ReactNative.Text, {
      key: "sub",
      style: { color: '#b9bbbe', fontSize: 16, textAlign: 'center', marginBottom: 40 }
    }, title),

    React.createElement(PinDots, { key: "dots", count: currentPin.length }),

    cooldown > 0 && React.createElement(ReactNative.Text, {
      key: "cooldown",
      style: { color: '#f04747', fontSize: 14, textAlign: 'center', marginBottom: 16 }
    }, `Locked — wait ${cooldown}s`),

    React.createElement(NumPad, {
      key: "pad",
      onDigit: handleDigit,
      onBack: handleBack,
      disabled: cooldown > 0
    })
  ]);
}

export { PinLock };
