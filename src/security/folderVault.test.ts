import { describe, expect, it } from 'vitest';
import { createDefaultState, createId } from '../domain/defaults';
import type { Collection } from '../domain/types';
import {
  decryptFolderVault,
  deriveFolderKey,
  encryptFolderVault,
  folderVaultFromLibrary,
  randomSalt,
  withoutFolderContents,
} from './folderVault';

describe('protected folder vaults', () => {
  it('encrypts and authenticates all contents in a folder', async () => {
    const state = createDefaultState();
    const workspace = state.workspaces[0]!;
    const now = Date.now();
    const collection: Collection = {
      id: createId(),
      workspaceId: workspace.id,
      name: 'Private research',
      description: 'Sensitive notes',
      tags: ['private'],
      tabs: [
        {
          id: createId(),
          title: 'Example',
          url: 'https://example.com/secret',
          pinned: false,
          muted: false,
          order: 0,
        },
      ],
      automatic: false,
      createdAt: now,
      updatedAt: now,
      order: 0,
    };
    const populated = { ...state, collections: [collection] };
    const vault = folderVaultFromLibrary(populated, state.folders[0]!.id);
    const key = await deriveFolderKey('correct horse battery staple', randomSalt());
    const encrypted = await encryptFolderVault(key, vault);

    expect(encrypted.ciphertext).not.toContain('example.com');
    await expect(decryptFolderVault(key, encrypted)).resolves.toEqual(vault);
  });

  it('rejects the wrong password key', async () => {
    const state = createDefaultState();
    const vault = folderVaultFromLibrary(state, state.folders[0]!.id);
    const salt = randomSalt();
    const correct = await deriveFolderKey('correct horse battery staple', salt);
    const wrong = await deriveFolderKey('wrong horse battery staple', salt);
    const encrypted = await encryptFolderVault(correct, vault);

    await expect(decryptFolderVault(wrong, encrypted)).rejects.toBeDefined();
  });

  it('removes protected descendants from the stored library shell', () => {
    const state = createDefaultState();
    const stripped = withoutFolderContents(state, state.folders[0]!.id);
    expect(stripped.folders).toHaveLength(1);
    expect(stripped.workspaces).toHaveLength(0);
  });
});
