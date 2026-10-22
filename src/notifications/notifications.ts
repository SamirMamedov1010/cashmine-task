import Toast from 'react-native-toast-message';

interface NotificationOptions {
  detail?: string;
  title: string;
}

function show(type: 'success' | 'error' | 'warning', options: NotificationOptions) {
  Toast.show({
    type,
    text1: options.title,
    text2: options.detail,
    position: 'top',
    visibilityTime: 3_500,
  });
}

export const notify = {
  success(options: NotificationOptions) {
    show('success', options);
  },
  error(options: NotificationOptions) {
    show('error', options);
  },
  warning(options: NotificationOptions) {
    show('warning', options);
  },
};
