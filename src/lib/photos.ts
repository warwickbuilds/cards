/**
 * Taking and preparing card pictures. The camera or gallery hands back a
 * file in the app's cache; it is shrunk to a sensible size, read into memory
 * as JPEG base64 (stored in the encrypted database), and every temporary
 * file is deleted straight away so no unencrypted copy is left behind.
 */

import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { CARD_ASPECT } from '@/theme/tokens';

import type { CardImage } from './types';

export type PhotoSource = 'camera' | 'library';
export type PreparedImage = Omit<CardImage, 'cardId' | 'side'>;

/** Long edge of the stored picture: sharp enough to read small print and scan a barcode. */
const FULL_EDGE = 1800;
const THUMB_EDGE = 640;

function safeDelete(uri: string | null | undefined) {
  if (!uri || !uri.startsWith('file:')) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // Already gone.
  }
}

export class PermissionDeniedError extends Error {}

export async function pickPhoto(
  source: PhotoSource,
  cropToCard: boolean,
  onBeforePicker?: () => void,
  onAfterPicker?: () => void,
): Promise<PreparedImage | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    // Crop to the shape of a bank card by default; the user can turn this off for odd-shaped cards.
    aspect: cropToCard ? [Math.round(CARD_ASPECT * 1000), 1000] : undefined,
    quality: 1,
    exif: false,
    base64: false,
  };
  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted)
      throw new PermissionDeniedError('Camera access is off for Cards. Turn it on in Android settings to take photos.');
    onBeforePicker?.();
    try {
      result = await ImagePicker.launchCameraAsync(options);
    } finally {
      onAfterPicker?.();
    }
  } else {
    onBeforePicker?.();
    try {
      result = await ImagePicker.launchImageLibraryAsync(options);
    } finally {
      onAfterPicker?.();
    }
  }
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  try {
    return await prepare(asset.uri, asset.width, asset.height);
  } finally {
    // The gallery picker gives us a copy in our cache, so deleting it never touches the user's own photo.
    safeDelete(asset.uri);
    sweepTempImages();
  }
}

async function render(uri: string, width: number, height: number, edge: number, compress: number) {
  const ctx = ImageManipulator.manipulate(uri);
  let ref: Awaited<ReturnType<typeof ctx.renderAsync>> | null = null;
  try {
    if (Math.max(width, height) > edge) {
      ctx.resize(width >= height ? { width: edge, height: null } : { width: null, height: edge });
    }
    ref = await ctx.renderAsync();
    const saved = await ref.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
    safeDelete(saved.uri);
    if (!saved.base64) throw new Error('Could not read the picture.');
    return saved;
  } finally {
    ref?.release();
    ctx.release();
  }
}

export async function prepare(uri: string, width: number, height: number): Promise<PreparedImage> {
  // Decode the full-resolution camera file once, then downscale the thumbnail from the resized image.
  const full = await render(uri, width, height, FULL_EDGE, 0.85);
  const thumb = await render(`data:image/jpeg;base64,${full.base64!}`, full.width, full.height, THUMB_EDGE, 0.7);
  return { full: full.base64!, thumb: thumb.base64!, width: full.width, height: full.height };
}

/** Turns a stored picture a quarter turn clockwise. */
export async function rotateImage(image: PreparedImage): Promise<PreparedImage> {
  const src = `data:image/jpeg;base64,${image.full}`;
  const ctx = ImageManipulator.manipulate(src);
  let ref: Awaited<ReturnType<typeof ctx.renderAsync>> | null = null;
  try {
    ref = await ctx.rotate(90).renderAsync();
    const saved = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.9, base64: true });
    safeDelete(saved.uri);
    if (!saved.base64) throw new Error('Could not read the picture.');
    const thumb = await render(`data:image/jpeg;base64,${saved.base64}`, saved.width, saved.height, THUMB_EDGE, 0.7);
    return { full: saved.base64, thumb: thumb.base64!, width: saved.width, height: saved.height };
  } finally {
    ref?.release();
    ctx.release();
  }
}

/**
 * Removes any leftover camera, crop or resize files from the app's cache.
 * Run on launch and after each picture, so nothing unencrypted lingers.
 */
export function sweepTempImages() {
  for (const name of ['ImagePicker', 'ImageManipulator', 'Camera', 'cropped']) {
    try {
      const dir = new Directory(Paths.cache, name);
      if (dir.exists) dir.delete();
    } catch {
      // Nothing to clear.
    }
  }
}
