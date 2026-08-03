import type {
  Collection,
  EncryptedPayload,
  FolderProtection,
  LibraryState,
  Note,
  SavedLink,
  Workspace,
} from '../domain/types';

export const FOLDER_KEY_ITERATIONS = 310_000;

export interface FolderVault {
  version: 1;
  folderId: string;
  workspaces: Workspace[];
  collections: Collection[];
  links: SavedLink[];
  notes: Note[];
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary);
};

const fromBase64 = (value: string): ArrayBuffer => {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
};

export const randomSalt = (): string => toBase64(crypto.getRandomValues(new Uint8Array(16)));

export const deriveFolderKey = async (
  password: string,
  salt: string,
  iterations = FOLDER_KEY_ITERATIONS,
): Promise<CryptoKey> => {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: fromBase64(salt),
      iterations,
    },
    material,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
};

export const exportFolderKey = async (key: CryptoKey): Promise<string> =>
  toBase64(new Uint8Array(await crypto.subtle.exportKey('raw', key)));

export const importFolderKey = (value: string): Promise<CryptoKey> =>
  crypto.subtle.importKey('raw', fromBase64(value), { name: 'AES-GCM' }, true, [
    'encrypt',
    'decrypt',
  ]);

export const encryptFolderVault = async (
  key: CryptoKey,
  vault: FolderVault,
): Promise<EncryptedPayload> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(vault)),
  );
  return { iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
};

export const decryptFolderVault = async (
  key: CryptoKey,
  payload: EncryptedPayload,
): Promise<FolderVault> => {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.ciphertext),
  );
  const vault = JSON.parse(decoder.decode(plaintext)) as FolderVault;
  if (vault.version !== 1 || !vault.folderId || !Array.isArray(vault.workspaces))
    throw new Error('The protected folder data is invalid.');
  return vault;
};

export const folderVaultFromLibrary = (state: LibraryState, folderId: string): FolderVault => {
  const workspaces = state.workspaces.filter((workspace) => workspace.folderId === folderId);
  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));
  return {
    version: 1,
    folderId,
    workspaces,
    collections: state.collections.filter((item) => workspaceIds.has(item.workspaceId)),
    links: state.links.filter((item) => workspaceIds.has(item.workspaceId)),
    notes: state.notes.filter((item) => workspaceIds.has(item.workspaceId)),
  };
};

export const withoutFolderContents = (state: LibraryState, folderId: string): LibraryState => {
  const workspaceIds = new Set(
    state.workspaces.filter((workspace) => workspace.folderId === folderId).map((item) => item.id),
  );
  return {
    ...state,
    workspaces: state.workspaces.filter((workspace) => workspace.folderId !== folderId),
    collections: state.collections.filter((item) => !workspaceIds.has(item.workspaceId)),
    links: state.links.filter((item) => !workspaceIds.has(item.workspaceId)),
    notes: state.notes.filter((item) => !workspaceIds.has(item.workspaceId)),
  };
};

export const createProtection = (salt: string): FolderProtection => ({
  version: 1,
  algorithm: 'AES-256-GCM',
  kdf: 'PBKDF2-SHA-256',
  iterations: FOLDER_KEY_ITERATIONS,
  salt,
  vault: { iv: '', ciphertext: '' },
});
