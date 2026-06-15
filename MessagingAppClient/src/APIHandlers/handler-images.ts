import { serverUrl } from './Helpers/config';
import { getStoredUniqueId } from '@/session/session-storage';
import type { ImageDataResponse, ImageUploadInput } from './Helpers/types';

export async function uploadImage(
    image: ImageUploadInput
): Promise<ImageDataResponse> {
    const ownerUniqueId = await getStoredUniqueId();
    const formData = new FormData();
    formData.append('ownerUniqueId', ownerUniqueId);
    formData.append('image', {
        uri: image.uri,
        name: image.name ?? 'image.jpg',
        type: image.type ?? 'image/jpeg',
    } as any);

    const response = await fetch(`${serverUrl}/images`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Upload image failed:', txt);
        throw new Error('Upload image failed');
    }

    return await response.json();
}

export function getImageUrl(imageId: string): string {
    return `${serverUrl}/images/${encodeURIComponent(imageId)}`;
}

export async function getImageMetadata(imageId: string): Promise<ImageDataResponse> {
    const response = await fetch(`${serverUrl}/images/${encodeURIComponent(imageId)}/metadata`);

    if (!response.ok) {
        const txt = await response.text();
        console.error('Get image metadata failed:', txt);
        throw new Error('Get image metadata failed');
    }

    return await response.json();
}

export async function getImagesForOwner(): Promise<ImageDataResponse[]> {
    const ownerUniqueId = await getStoredUniqueId();
    const response = await fetch(`${serverUrl}/images/owners/${encodeURIComponent(ownerUniqueId)}`);

    if (!response.ok) {
        const txt = await response.text();
        console.error('Get owner images failed:', txt);
        throw new Error('Get owner images failed');
    }

    return await response.json();
}

export async function deleteImage(imageId: string): Promise<boolean> {
    const ownerUniqueId = await getStoredUniqueId();
    const response = await fetch(
        `${serverUrl}/images/${encodeURIComponent(imageId)}?ownerUniqueId=${encodeURIComponent(ownerUniqueId)}`,
        { method: 'DELETE' }
    );

    if (!response.ok) {
        const txt = await response.text();
        console.error('Delete image failed:', txt);
        throw new Error('Delete image failed');
    }

    return true;
}
