import { apiFetch } from './Helpers/api-fetch';
import { apiUrl, apiUrlSync } from './Helpers/config';
import { getStoredUniqueId } from '@/session/session-storage';
import type { ImageDataResponse, ImageUploadInput } from './Helpers/types';

export async function uploadImage(
    image: ImageUploadInput
): Promise<ImageDataResponse> {
    const ownerUniqueId = await getStoredUniqueId();
    const imageName = image.name ?? image.file?.name ?? 'image.jpg';
    const formData = new FormData();
    formData.append('ownerUniqueId', ownerUniqueId);

    const apiUrlAddress = await apiUrl('/images');

    if (image.file) {
        formData.append('image', image.file, imageName);
    } else {
        formData.append('image', {
            uri: image.uri,
            name: imageName,
            type: image.type ?? 'image/jpeg',
        } as any);
        return await uploadImageWithXmlHttpRequest(formData, apiUrlAddress);
    }

    const response = await fetch(apiUrlAddress, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Upload image failed:', txt);
        throw new Error(txt || 'Upload image failed');
    }

    return await response.json();
}

function uploadImageWithXmlHttpRequest(formData: FormData, serverAddress: string): Promise<ImageDataResponse> {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();

        request.open('POST', serverAddress);

        request.onload = () => {
            if (request.status < 200 || request.status >= 300) {
                console.error('Upload image failed:', request.responseText);
                reject(new Error(request.responseText || 'Upload image failed'));
                return;
            }

            try {
                resolve(JSON.parse(request.responseText));
            } catch (err) {
                reject(err instanceof Error ? err : new Error('Upload image failed'));
            }
        };

        request.onerror = () => {
            reject(new Error('Upload image failed'));
        };

        request.ontimeout = () => {
            reject(new Error('Upload image timed out'));
        };

        request.timeout = 30000;
        request.send(formData);
    });
}

export function getImageUrl(imageId: string): string {
    return apiUrlSync(`/images/${encodeURIComponent(imageId)}`);
}

export async function getImageMetadata(imageId: string): Promise<ImageDataResponse> {
    const response = await apiFetch(`/images/${encodeURIComponent(imageId)}/metadata`);

    if (!response.ok) {
        const txt = await response.text();
        console.error('Get image metadata failed:', txt);
        throw new Error('Get image metadata failed');
    }

    return await response.json();
}

export async function getImagesForOwner(): Promise<ImageDataResponse[]> {
    const ownerUniqueId = await getStoredUniqueId();
    const response = await apiFetch(`/images/owners/${encodeURIComponent(ownerUniqueId)}`);

    if (!response.ok) {
        const txt = await response.text();
        console.error('Get owner images failed:', txt);
        throw new Error('Get owner images failed');
    }

    return await response.json();
}

export async function deleteImage(imageId: string): Promise<boolean> {
    const ownerUniqueId = await getStoredUniqueId();

    const apiUrlAddress = await apiUrl(`/images/${encodeURIComponent(imageId)}?ownerUniqueId=${encodeURIComponent(ownerUniqueId)}`);

    const response = await fetch(apiUrlAddress, { method: 'DELETE' });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Delete image failed:', txt);
        throw new Error('Delete image failed');
    }

    return true;
}
