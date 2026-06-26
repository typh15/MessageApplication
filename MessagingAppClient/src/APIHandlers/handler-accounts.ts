import { apiUrl } from './Helpers/config';
import type { PublicAccountDataResponse } from './Helpers/types';

import { getStoredUniqueId } from '@/session/session-storage';

export async function getUserAccount(): Promise<PublicAccountDataResponse> {
    const uniqueId = await getStoredUniqueId();
    const apiUrlAddress = await apiUrl(`/user-accounts/${encodeURIComponent(uniqueId)}`);
    const response = await fetch(apiUrlAddress);

    if (!response.ok) {
        const txt = await response.text();
        console.error('Get account failed:', txt);
        throw new Error('Failed to get user account');
    }

    return await response.json();
}

export async function updateDisplayName(displayName: string): Promise<boolean> {
    return await updateAccountData('display-name', { DisplayName: displayName });
}

export async function updatePublicBlurb(publicBlurb: string): Promise<boolean> {
    return await updateAccountData('public-blurb', { PublicBlurb: publicBlurb });
}

export async function updateAvatarImage(avatarImageId: string): Promise<boolean> {
    return await updateAccountData('avatar', { AvatarImageId: avatarImageId });
}

async function updateAccountData(
    fieldName: 'display-name' | 'public-blurb' | 'avatar',
    body: Record<string, string>
): Promise<boolean> {
    const uniqueId = await getStoredUniqueId();
    const apiUrlAddress = await apiUrl(`/user-accounts/${encodeURIComponent(uniqueId)}/${fieldName}`);
    const response = await fetch( apiUrlAddress,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }
    );

    if (!response.ok) {
        const txt = await response.text();
        console.error('Update account failed:', txt);
        throw new Error('Failed to update account');
    }

    return true;
}
