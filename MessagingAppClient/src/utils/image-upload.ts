import * as ImagePicker from 'expo-image-picker';

import type { ImageUploadInput } from '@/APIHandlers/ApiHandlerHub';

export const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function inferImageContentType(fileNameOrUri: string | null | undefined): string {
    const cleanValue = fileNameOrUri?.split('?')[0].toLowerCase() ?? '';

    if (cleanValue.endsWith('.png')) return 'image/png';
    if (cleanValue.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
}

function getImageExtension(contentType: string): string {
    if (contentType === 'image/png') return 'png';
    if (contentType === 'image/webp') return 'webp';
    return 'jpg';
}

export function createImageUploadInput(
    asset: ImagePicker.ImagePickerAsset,
    fallbackFileName: string = 'image'
): ImageUploadInput {
    const contentType = asset.mimeType ?? asset.file?.type ?? inferImageContentType(asset.fileName ?? asset.uri);
    const name = asset.fileName ?? asset.file?.name ?? `${fallbackFileName}.${getImageExtension(contentType)}`;

    return {
        uri: asset.uri,
        name,
        type: contentType,
        file: asset.file,
    };
}
