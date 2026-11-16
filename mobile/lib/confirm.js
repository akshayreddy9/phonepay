import { Alert, Platform } from 'react-native';

// Alert.alert does nothing in the browser preview, so fall back to window.confirm there.
export function confirmAction(title, message, okText, onOk) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: okText, style: 'destructive', onPress: onOk }]);
}
