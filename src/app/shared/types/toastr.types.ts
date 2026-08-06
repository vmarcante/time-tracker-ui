export interface ToastrAlertData {
  type: 'success' | 'error' | 'warning' | 'info';
  messageContent: string;
  button?: {
    label: string;
    action: () => void;
  };
  autoClose?: {
    duration: number;
  };
  queueInfo?: {
    current: number;
    total: number;
  };
}

export interface ToastrAlertSimpleOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  button?: {
    label: string;
    action: () => void;
  };
  autoClose?: {
    duration: number;
  };
}
