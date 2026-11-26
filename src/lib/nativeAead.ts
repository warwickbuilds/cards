/** AES-256-GCM using the phone's own crypto (expo-crypto), for backups. */

import { aesDecryptAsync, aesEncryptAsync, AESEncryptionKey, AESSealedData, getRandomBytes } from 'expo-crypto';

import { TAG_BYTES, type Aead } from './backupCrypto';

export const nativeAead: Aead = {
  async encrypt(keyBytes, nonce, plaintext, aad) {
    const key = await AESEncryptionKey.import(keyBytes);
    const sealed = await aesEncryptAsync(plaintext, key, { nonce: { bytes: nonce }, additionalData: aad, tagLength: TAG_BYTES });
    return sealed.ciphertext({ includeTag: true, encoding: 'bytes' });
  },
  async decrypt(keyBytes, nonce, ciphertextWithTag, aad) {
    const key = await AESEncryptionKey.import(keyBytes);
    const sealed = AESSealedData.fromParts(nonce, ciphertextWithTag, TAG_BYTES);
    return aesDecryptAsync(sealed, key, { output: 'bytes', additionalData: aad });
  },
};

export const randomBytes = (n: number) => getRandomBytes(n);
