import React, { useCallback, useState } from 'react';
import CustomAlert from '../components/CustomAlert';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  type: AlertType;
  showCancel: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const initial: AlertState = {
  visible: false,
  title: '',
  message: '',
  type: 'info',
  showCancel: false,
};

/** Брендированные алерты вместо Alert.alert */
export function useAppAlert() {
  const [alert, setAlert] = useState<AlertState>(initial);

  const hideAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, visible: false }));
  }, []);

  const showAlert = useCallback(
    (title: string, message: string, type: AlertType = 'info', onConfirm?: () => void) => {
      setAlert({
        visible: true,
        title,
        message,
        type,
        showCancel: false,
        onConfirm,
        onCancel: hideAlert,
      });
    },
    [hideAlert],
  );

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      options?: { confirmText?: string; cancelText?: string; type?: AlertType },
    ) => {
      setAlert({
        visible: true,
        title,
        message,
        type: options?.type ?? 'warning',
        showCancel: true,
        confirmText: options?.confirmText,
        cancelText: options?.cancelText,
        onConfirm: () => {
          hideAlert();
          onConfirm();
        },
        onCancel: hideAlert,
      });
    },
    [hideAlert],
  );

  const AlertHost = useCallback(
    () => (
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        showCancel={alert.showCancel}
        confirmText={alert.confirmText}
        cancelText={alert.cancelText}
        onConfirm={() => {
          if (alert.onConfirm) alert.onConfirm();
          else hideAlert();
        }}
        onCancel={alert.onCancel ?? hideAlert}
      />
    ),
    [alert, hideAlert],
  );

  return { showAlert, showConfirm, hideAlert, AlertHost };
}
