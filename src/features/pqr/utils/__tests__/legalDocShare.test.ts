import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SecureStorage } from '@core/auth/SecureStorage';
import { notifySessionExpired } from '@core/api/client';
import {
  downloadLegalDocPdf,
  downloadCertificatePdf,
  sharePdf,
  pdfFailureMessage,
} from '../legalDocShare';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///mock-cache/',
  downloadAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock('@core/auth/SecureStorage', () => ({
  SecureStorage: {
    getSessionToken: jest.fn(),
    removeSessionToken: jest.fn(),
  },
  SESSION_TOKEN_KEY: 'authjs.session-token',
}));

// El cliente se simula entero: importarlo de verdad arrastra Axios a Jest.
jest.mock('@core/api/client', () => ({
  notifySessionExpired: jest.fn(),
}));

const mockDownload = FileSystem.downloadAsync as unknown as jest.Mock;
const mockDelete = FileSystem.deleteAsync as unknown as jest.Mock;
const mockIsAvailable = Sharing.isAvailableAsync as unknown as jest.Mock;
const mockShare = Sharing.shareAsync as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_API_URL = 'https://api.quejate.com.co/api';
  (SecureStorage.getSessionToken as jest.Mock).mockResolvedValue('tok123');
  (SecureStorage.removeSessionToken as jest.Mock).mockResolvedValue(undefined);
  mockDelete.mockResolvedValue(undefined);
});

describe('downloadLegalDocPdf', () => {
  it('pide el PDF al host absoluto y con el Bearer puesto a mano', async () => {
    // downloadAsync no pasa por apiClient, así que no hay interceptor que ponga
    // la cabecera: si esto se rompe, todas las descargas devuelven 401.
    mockDownload.mockResolvedValue({ uri: 'file:///mock-cache/tutela-doc-1.pdf', status: 200 });

    const res = await downloadLegalDocPdf('doc-1');

    expect(res).toEqual({ ok: true, uri: 'file:///mock-cache/tutela-doc-1.pdf' });

    const [url, target, options] = mockDownload.mock.calls[0];
    expect(url).toBe('https://api.quejate.com.co/api/legal-docs/doc-1/pdf');
    expect(target).toBe('file:///mock-cache/tutela-doc-1.pdf');
    expect(options.headers.Authorization).toBe('Bearer tok123');
  });

  it('no construye la URL partiendo el host api.*', async () => {
    // Regresión de la trampa de useAuth: `.replace('/api','')` casaría con el
    // `//api` del host y dejaría `https:/.quejate.com.co/...`.
    mockDownload.mockResolvedValue({ uri: 'file:///mock-cache/x.pdf', status: 200 });

    await downloadLegalDocPdf('doc-1');

    const [url] = mockDownload.mock.calls[0];
    expect(url.startsWith('https://api.quejate.com.co/api/')).toBe(true);
    expect(url).not.toContain('https:/.');
  });

  it('con 401 limpia la sesión, avisa y borra el fichero escrito', async () => {
    mockDownload.mockResolvedValue({ uri: 'file:///mock-cache/tutela-doc-1.pdf', status: 401 });

    const res = await downloadLegalDocPdf('doc-1');

    expect(res).toEqual({ ok: false, reason: 'session-expired' });
    expect(SecureStorage.removeSessionToken).toHaveBeenCalled();
    expect(notifySessionExpired).toHaveBeenCalled();
    // El cuerpo del error se escribió en disco con extensión .pdf: hay que borrarlo.
    expect(mockDelete).toHaveBeenCalledWith('file:///mock-cache/tutela-doc-1.pdf', {
      idempotent: true,
    });
  });

  it('con 404 devuelve not-found sin tocar la sesión', async () => {
    mockDownload.mockResolvedValue({ uri: 'file:///mock-cache/tutela-doc-1.pdf', status: 404 });

    const res = await downloadLegalDocPdf('doc-1');

    expect(res).toEqual({ ok: false, reason: 'not-found' });
    expect(SecureStorage.removeSessionToken).not.toHaveBeenCalled();
    expect(notifySessionExpired).not.toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalled();
  });

  it('con otro estado devuelve failed y borra el fichero', async () => {
    mockDownload.mockResolvedValue({ uri: 'file:///mock-cache/tutela-doc-1.pdf', status: 500 });

    expect(await downloadLegalDocPdf('doc-1')).toEqual({ ok: false, reason: 'failed' });
    expect(mockDelete).toHaveBeenCalled();
  });

  it('sin token no llega a pedir nada', async () => {
    (SecureStorage.getSessionToken as jest.Mock).mockResolvedValue(null);

    expect(await downloadLegalDocPdf('doc-1')).toEqual({
      ok: false,
      reason: 'session-expired',
    });
    expect(mockDownload).not.toHaveBeenCalled();
    expect(notifySessionExpired).toHaveBeenCalled();
  });

  it('si la red falla devuelve failed en vez de propagar', async () => {
    mockDownload.mockRejectedValue(new TypeError('Network request failed'));

    expect(await downloadLegalDocPdf('doc-1')).toEqual({ ok: false, reason: 'failed' });
  });

  it('sanea el id antes de usarlo como nombre de fichero', async () => {
    mockDownload.mockResolvedValue({ uri: 'file:///mock-cache/x.pdf', status: 200 });

    await downloadLegalDocPdf('../../etc/passwd');

    const [, target] = mockDownload.mock.calls[0];
    expect(target).toBe('file:///mock-cache/tutela-------etc-passwd.pdf');
  });
});

describe('downloadCertificatePdf', () => {
  it('pide el certificado de la PQRSD', async () => {
    mockDownload.mockResolvedValue({ uri: 'file:///mock-cache/certificado-pqr-1.pdf', status: 200 });

    const res = await downloadCertificatePdf('pqr-1');

    expect(res).toEqual({ ok: true, uri: 'file:///mock-cache/certificado-pqr-1.pdf' });
    const [url] = mockDownload.mock.calls[0];
    expect(url).toBe('https://api.quejate.com.co/api/pqr/pqr-1/certificate.pdf');
  });

  it('con 404 devuelve not-found: no distingue "no es tuya" de "no existe"', async () => {
    mockDownload.mockResolvedValue({ uri: 'file:///mock-cache/c.pdf', status: 404 });

    expect(await downloadCertificatePdf('pqr-ajena')).toEqual({
      ok: false,
      reason: 'not-found',
    });
  });
});

describe('sharePdf', () => {
  it('comparte con el tipo de PDF', async () => {
    mockIsAvailable.mockResolvedValue(true);

    expect(await sharePdf('file:///mock-cache/t.pdf', 'Compartir tutela')).toBe(true);
    expect(mockShare).toHaveBeenCalledWith('file:///mock-cache/t.pdf', {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Compartir tutela',
    });
  });

  it('devuelve false si el teléfono no ofrece compartir', async () => {
    mockIsAvailable.mockResolvedValue(false);

    expect(await sharePdf('file:///mock-cache/t.pdf', 'Compartir')).toBe(false);
    expect(mockShare).not.toHaveBeenCalled();
  });
});

describe('pdfFailureMessage', () => {
  it('da un mensaje distinto por motivo', () => {
    expect(pdfFailureMessage('session-expired')).toMatch(/sesión caducó/i);
    expect(pdfFailureMessage('not-found')).toMatch(/ya no está disponible/i);
    expect(pdfFailureMessage('failed')).toMatch(/conexión/i);
  });
});
