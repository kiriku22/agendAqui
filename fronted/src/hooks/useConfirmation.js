import { useState } from 'react';

export function useConfirmation() {
  const [state, setState] = useState({
    isOpen: false,
    action: null,
    title: '',
    message: '',
    variant: 'warning',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    loading: false
  });

  const confirm = (action, config) => {
    setState({
      isOpen: true,
      action,
      title: config.title,
      message: config.message,
      variant: config.variant || 'warning',
      confirmText: config.confirmText || 'Confirmar',
      cancelText: config.cancelText || 'Cancelar',
      loading: false
    });
  };

  const close = () => {
    setState(s => ({ ...s, isOpen: false, loading: false }));
  };

  const execute = async () => {
    setState(s => ({ ...s, loading: true }));
    try {
      if (state.action) {
        await state.action();
      }
      close();
    } catch (error) {
      setState(s => ({ ...s, loading: false }));
      throw error;
    }
  };

  return { state, confirm, close, execute };
}
