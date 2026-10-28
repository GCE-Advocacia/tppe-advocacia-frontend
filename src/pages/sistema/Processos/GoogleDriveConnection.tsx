import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HardDrive } from 'lucide-react';
import {
  disconnectGoogleDrive,
  getGoogleDriveAuthUrl,
  getGoogleDriveStatus,
  GoogleDriveStatus,
} from '../../../services/googleDrive';
import styles from './Processos.module.css';

type Message = { message: string; kind: 'success' | 'error' };

type Props = {
  onMessage: (message: Message) => void;
};

// Conexão do Google Drive do escritório (só administradores veem este bloco).
export default function GoogleDriveConnection({ onMessage }: Props) {
  const [status, setStatus] = useState<GoogleDriveStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  async function loadStatus() {
    try {
      setStatus(await getGoogleDriveStatus());
    } catch {
      setStatus({ connected: false, email: null });
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  // Retorno do consentimento do Google: ?google_drive=connected|error
  useEffect(() => {
    const result = searchParams.get('google_drive');
    if (!result) return;
    if (result === 'connected') {
      onMessage({ message: 'Google Drive conectado com sucesso!', kind: 'success' });
    } else {
      onMessage({ message: 'Não foi possível conectar o Google Drive.', kind: 'error' });
    }
    searchParams.delete('google_drive');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams]);

  async function handleConnect() {
    setBusy(true);
    try {
      window.location.href = await getGoogleDriveAuthUrl();
    } catch {
      onMessage({ message: 'Não foi possível conectar o Google Drive.', kind: 'error' });
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    try {
      await disconnectGoogleDrive();
      setStatus({ connected: false, email: null });
      onMessage({ message: 'Google Drive desconectado.', kind: 'success' });
    } catch {
      onMessage({ message: 'Não foi possível desconectar o Google Drive.', kind: 'error' });
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;

  return (
    <div className={styles.driveBlock} data-google-drive>
      <HardDrive size={16} />
      {status.connected ? (
        <>
          <span className={styles.driveText}>Google Drive conectado: {status.email}</span>
          <button className={styles.btnRefresh} onClick={() => void handleDisconnect()} disabled={busy}>
            Desconectar
          </button>
        </>
      ) : (
        <button className={styles.btnRefresh} onClick={() => void handleConnect()} disabled={busy}>
          Conectar Google Drive
        </button>
      )}
    </div>
  );
}
