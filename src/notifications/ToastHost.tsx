import { BaseToast, type ToastConfig } from 'react-native-toast-message';

const sharedStyle = {
  width: '90%' as const,
  maxWidth: 440,
  minHeight: 68,
  borderRadius: 16,
  borderLeftWidth: 5,
};

export const cashMineToastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={[sharedStyle, { borderLeftColor: '#2AA879' }]}
      contentContainerStyle={{ paddingHorizontal: 14 }}
      text1Style={{ color: '#1E1830', fontSize: 15, fontWeight: '800' }}
      text2NumberOfLines={2}
      text2Style={{ color: '#6F687D', fontSize: 13 }}
    />
  ),
  error: (props) => (
    <BaseToast
      {...props}
      style={[sharedStyle, { borderLeftColor: '#D04444' }]}
      contentContainerStyle={{ paddingHorizontal: 14 }}
      text1Style={{ color: '#1E1830', fontSize: 15, fontWeight: '800' }}
      text2NumberOfLines={2}
      text2Style={{ color: '#6F687D', fontSize: 13 }}
    />
  ),
  warning: (props) => (
    <BaseToast
      {...props}
      style={[sharedStyle, { borderLeftColor: '#E5A72D' }]}
      contentContainerStyle={{ paddingHorizontal: 14 }}
      text1Style={{ color: '#1E1830', fontSize: 15, fontWeight: '800' }}
      text2NumberOfLines={2}
      text2Style={{ color: '#6F687D', fontSize: 13 }}
    />
  ),
};
