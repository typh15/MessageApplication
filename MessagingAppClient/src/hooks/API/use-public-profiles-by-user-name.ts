import { useEffect, useMemo, useState } from 'react';

import * as APIHandler from '@/APIHandlers/ApiHandlerHub';
import type { PublicProfileResponse } from '@/APIHandlers/ApiHandlerHub';

export type PublicProfileByUserName = Record<string, PublicProfileResponse | null>;

export function getProfileCacheKey(userName: string): string {
    return userName.trim().toLowerCase();
}

export function usePublicProfilesByUserName(userNames: string[]): PublicProfileByUserName {
    const normalizedUserNames = useMemo(() => {
        const userNameByKey = new Map<string, string>();

        for (const userName of userNames) {
            const trimmedUserName = userName.trim();

            if (trimmedUserName) {
                userNameByKey.set(getProfileCacheKey(trimmedUserName), trimmedUserName);
            }
        }

        return Array.from(userNameByKey.values());
    }, [userNames.join('\n')]);
    const normalizedUserNameKey = normalizedUserNames.join('\n');
    const [profilesByUserName, setProfilesByUserName] = useState<PublicProfileByUserName>({});

    useEffect(() => {
        const missingUserNames = normalizedUserNames.filter(
            (userName) => !(getProfileCacheKey(userName) in profilesByUserName)
        );

        if (missingUserNames.length === 0) {
            return;
        }

        let cancelled = false;

        Promise.all(
            missingUserNames.map(async (userName) => {
                try {
                    return [userName, await APIHandler.getPublicProfile(userName)] as const;
                } catch (err) {
                    console.error('Load public profile error:', err);
                    return [userName, null] as const;
                }
            })
        ).then((profileEntries) => {
            if (cancelled) {
                return;
            }

            setProfilesByUserName((currentProfiles) => {
                const nextProfiles = { ...currentProfiles };

                for (const [userName, profile] of profileEntries) {
                    nextProfiles[getProfileCacheKey(userName)] = profile;
                }

                return nextProfiles;
            });
        });

        return () => {
            cancelled = true;
        };
    }, [normalizedUserNameKey, profilesByUserName]);

    return profilesByUserName;
}
