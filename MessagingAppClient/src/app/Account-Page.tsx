import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import * as APIHandler from '@/APIHandlers/ApiHandlerHub';
import type { MessageBoardInvite, PublicAccountDataResponse } from '@/APIHandlers/ApiHandlerHub';
import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';
import { Button } from '@/components/ui/generic-button';
import { BottomTabInset, Spacing } from '@/constants/theme';
import {
    getProfileCacheKey,
    usePublicProfilesByUserName,
} from '@/hooks/API/use-public-profiles-by-user-name';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import {
    diagnosePushNotificationRegistration,
    shouldShowPushNotificationDiagnostics,
    type PushNotificationDiagnosticsResult,
} from '@/plugins/push-notifications';
import { createImageUploadInput, SUPPORTED_IMAGE_TYPES } from '@/utils/image-upload';
import {
    formatPrivateUserChatParticipantLabel,
    getOtherPrivateUserChatUserName,
} from '@/utils/private-user-chat';

type InviteAction = 'accept' | 'decline';

export default function AccountScreen() {
    const router = useRouter();
    const { session, loading: sessionLoading, clear } = useSession();
    const theme = useTheme();
    const safeAreaInsets = useSafeAreaInsets();
    const [account, setAccount] = useState<PublicAccountDataResponse | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [publicBlurb, setPublicBlurb] = useState('');
    const [invites, setInvites] = useState<MessageBoardInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingAccount, setSavingAccount] = useState(false);
    const [updatingAvatar, setUpdatingAvatar] = useState(false);
    const [checkingPushNotifications, setCheckingPushNotifications] = useState(false);
    const [pushDiagnostics, setPushDiagnostics] =
        useState<PushNotificationDiagnosticsResult | null>(null);
    const [inviteBusyState, setInviteBusyState] = useState<{ boardId: number; action: InviteAction } | null>(null);
    const [error, setError] = useState('');

    const insets = {
        ...safeAreaInsets,
        bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
    };

    const loadAccountPage = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const [accountData, inviteData] = await Promise.all([
                APIHandler.getUserAccount(),
                APIHandler.getUserBoardInvites(),
            ]);

            setAccount(accountData);
            setDisplayName(accountData.displayName ?? '');
            setPublicBlurb(accountData.publicBlurb ?? '');
            setInvites(inviteData);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load account';
            setError(errorMessage);
            console.error('Load account page error:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (sessionLoading) {
            return;
        }

        if (!session) {
            router.replace('../Login-Registration-Page');
            return;
        }

        loadAccountPage();
    }, [loadAccountPage, router, session, sessionLoading]);

    const handleSaveAccount = async () => {
        try {
            setSavingAccount(true);
            setError('');

            if ((account?.displayName ?? '') !== displayName.trim()) {
                await APIHandler.updateDisplayName(displayName.trim());
            }

            if ((account?.publicBlurb ?? '') !== publicBlurb) {
                await APIHandler.updatePublicBlurb(publicBlurb);
            }

            await loadAccountPage();
            Alert.alert('Saved', 'Your account details were updated.');
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to save account';
            setError(errorMessage);
            console.error('Save account error:', err);
            Alert.alert('Error', errorMessage);
        }
        finally {
            setSavingAccount(false);
        }
    };

    const handlePickProfileImage = async () => {
        if (!session) {
            Alert.alert('Session expired', 'Please log in again before choosing a profile picture.');
            router.replace('../Login-Registration-Page');
            return;
        }

        try {
            setUpdatingAvatar(true);
            setError('');

            if (Platform.OS !== 'web') {
                const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

                if (!permission.granted) {
                    Alert.alert('Photo access needed', 'Please allow photo access to choose a profile picture.');
                    return;
                }
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: false,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.85,
            });

            if (result.canceled) {
                return;
            }

            const pickedImage = result.assets[0];

            if (!pickedImage?.uri) {
                throw new Error('No picture was selected.');
            }

            const imageInput = createImageUploadInput(pickedImage, 'profile-picture');

            if (imageInput.type && !SUPPORTED_IMAGE_TYPES.has(imageInput.type.toLowerCase())) {
                Alert.alert('Unsupported picture', 'Please choose a JPEG, PNG, or WebP image.');
                return;
            }

            const uploadedImage = await APIHandler.uploadImage(imageInput);
            await APIHandler.updateAvatarImage(uploadedImage.imageId);
            await loadAccountPage();
            Alert.alert('Profile picture saved', 'Your account picture was updated.');
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update profile picture';
            setError(errorMessage);
            console.error('Profile image error:', err);
            Alert.alert('Error', errorMessage);
        }
        finally {
            setUpdatingAvatar(false);
        }
    };

    const handleInviteAction = async (
        invite: MessageBoardInvite,
        action: InviteAction,
        inviteTitle: string = invite.boardName
    ) => {
        try {
            setInviteBusyState({ boardId: invite.boardId, action });
            setError('');

            if (action === 'accept') {
                await APIHandler.acceptBoardInvite(invite.boardId);
                await loadAccountPage();
                router.push({
                    pathname: '../Chat-Page',
                    params: { boardId: invite.boardId.toString() },
                });
                return;
            }

            await APIHandler.rejectBoardInvite(invite.boardId);
            await loadAccountPage();
            Alert.alert('Invite declined', `${inviteTitle} was removed from your invites.`);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update invite';
            setError(errorMessage);
            console.error('Invite action error:', err);
            Alert.alert('Error', errorMessage);
        }
        finally {
            setInviteBusyState(null);
        }
    };

    const handleSignOut = async () => {
        await clear();
        router.replace('../Login-Registration-Page');
    };

    const handleCheckPushNotifications = async () => {
        if (!session) {
            Alert.alert('Session expired', 'Please log in again before checking notifications.');
            router.replace('../Login-Registration-Page');
            return;
        }

        try {
            setCheckingPushNotifications(true);
            setPushDiagnostics(null);
            setPushDiagnostics(await diagnosePushNotificationRegistration(session));
        }
        catch (err) {
            const errorMessage = err instanceof Error
                ? err.message
                : 'Push notification check failed.';

            setPushDiagnostics({
                status: 'failed',
                message: errorMessage,
                details: [errorMessage],
            });
        }
        finally {
            setCheckingPushNotifications(false);
        }
    };

    const accountChanged =
        (account?.displayName ?? '') !== displayName.trim() ||
        (account?.publicBlurb ?? '') !== publicBlurb;
    const avatarImageUrl = account?.avatarImageId ? APIHandler.getImageUrl(account.avatarImageId) : null;
    const avatarInitial = (displayName.trim() || session?.userName || '?').charAt(0).toUpperCase();
    const privateChatInviteUserNames = useMemo(
        () => getPrivateChatUserNamesFromInvites(invites, session?.userName),
        [invites, session?.userName]
    );
    const privateChatProfilesByUserName = usePublicProfilesByUserName(privateChatInviteUserNames);
    const showPushNotificationDiagnostics = shouldShowPushNotificationDiagnostics();

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.background }]}
            contentInset={insets}
            contentContainerStyle={styles.contentContainer}
        >
            <ThemedView style={styles.header}>
                <Button
                    showText={true}
                    buttonText={'\u2190 Back'}
                    onPress={() => router.push('../Homescreen-Board-Select-Page')}
                    style={styles.backButton}
                    textStyle={styles.buttonText}
                />
                <ThemedText type="title">Account</ThemedText>
            </ThemedView>

            {error ? (
                <ThemedView style={styles.errorContainer}>
                    <ThemedText style={styles.errorText}>{error}</ThemedText>
                </ThemedView>
            ) : null}

            {showPushNotificationDiagnostics ? (
                <ThemedView style={[styles.section, { borderColor: theme.genericborder }]}>
                    <ThemedView style={styles.sectionHeader}>
                        <ThemedText type="subtitle" style={styles.sectionTitle}>Notifications</ThemedText>
                        <Button
                            showText={true}
                            buttonText={checkingPushNotifications ? 'Checking...' : 'Check'}
                            onPress={handleCheckPushNotifications}
                            disabled={checkingPushNotifications || sessionLoading}
                            style={styles.compactButton}
                            textStyle={styles.compactButtonText}
                        />
                    </ThemedView>

                    <ThemedText
                        style={[
                            styles.detailText,
                            pushDiagnostics?.status === 'registered' && styles.successText,
                            pushDiagnostics?.status === 'skipped' && styles.warningText,
                            pushDiagnostics?.status === 'failed' && styles.errorText,
                        ]}
                    >
                        {pushDiagnostics?.message ?? 'Not checked'}
                    </ThemedText>

                    {pushDiagnostics ? (
                        <ThemedView style={styles.diagnosticList}>
                            {pushDiagnostics.details.map((detail, index) => (
                                <ThemedText
                                    key={`${detail}-${index}`}
                                    type="code"
                                    style={styles.diagnosticLine}
                                >
                                    {detail}
                                </ThemedText>
                            ))}
                        </ThemedView>
                    ) : null}
                </ThemedView>
            ) : null}

            <ThemedView style={[styles.section, { borderColor: theme.genericborder }]}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>Profile</ThemedText>
                <ThemedView style={styles.profileHeader}>
                    <ThemedView style={styles.avatarFrame}>
                        {avatarImageUrl ? (
                            <Image
                                source={{ uri: avatarImageUrl }}
                                style={styles.avatarImage}
                                contentFit="cover"
                                transition={120}
                                accessibilityLabel="Profile picture"
                            />
                        ) : (
                            <ThemedText style={styles.avatarInitial}>{avatarInitial}</ThemedText>
                        )}
                    </ThemedView>

                    <ThemedView style={styles.profileCopy}>
                        <ThemedText style={styles.detailText}>
                            Username: {session?.userName ?? 'Unknown'}
                        </ThemedText>
                        <Button
                            showText={true}
                            buttonText={updatingAvatar ? 'Uploading...' : 'Choose Photo'}
                            onPress={handlePickProfileImage}
                            disabled={loading || updatingAvatar}
                            style={styles.secondaryButton}
                            textStyle={styles.buttonText}
                        />
                    </ThemedView>
                </ThemedView>

                <ThemedView style={styles.inputGroup}>
                    <ThemedText style={styles.label}>Display Name</ThemedText>
                    <TextInput
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder="Display name"
                        placeholderTextColor="#8E95A8"
                        style={styles.input}
                        editable={!loading && !savingAccount}
                    />
                </ThemedView>

                <ThemedView style={styles.inputGroup}>
                    <ThemedText style={styles.label}>Public Blurb</ThemedText>
                    <TextInput
                        value={publicBlurb}
                        onChangeText={setPublicBlurb}
                        placeholder="Short public note"
                        placeholderTextColor="#8E95A8"
                        style={[styles.input, styles.multilineInput]}
                        multiline
                        editable={!loading && !savingAccount}
                    />
                </ThemedView>

                <ThemedView style={styles.actionRow}>
                    <Button
                        showText={true}
                        buttonText={savingAccount ? 'Saving...' : 'Save'}
                        onPress={handleSaveAccount}
                        disabled={loading || savingAccount || !accountChanged || !displayName.trim()}
                        style={styles.primaryButton}
                        textStyle={styles.buttonText}
                    />
                    <Button
                        showText={true}
                        buttonText="Sign Out"
                        onPress={handleSignOut}
                        disabled={savingAccount}
                        style={styles.secondaryButton}
                        textStyle={styles.buttonText}
                    />
                </ThemedView>
            </ThemedView>

            <ThemedView style={[styles.section, { borderColor: theme.genericborder }]}>
                <ThemedView style={styles.sectionHeader}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>Board Invites</ThemedText>
                    <Button
                        showText={true}
                        buttonText="Refresh"
                        onPress={loadAccountPage}
                        disabled={loading}
                        style={styles.compactButton}
                        textStyle={styles.compactButtonText}
                    />
                </ThemedView>

                {loading ? (
                    <ThemedText style={styles.detailText}>Loading...</ThemedText>
                ) : invites.length === 0 ? (
                    <ThemedText style={styles.emptyText}>No pending invites</ThemedText>
                ) : (
                    <ThemedView style={styles.inviteList}>
                        {invites.map((invite) => {
                            const privateChatUserName = getOtherPrivateUserChatUserName(
                                invite.boardName,
                                session?.userName
                            );
                            const privateChatProfile = privateChatUserName
                                ? privateChatProfilesByUserName[getProfileCacheKey(privateChatUserName)]
                                : null;
                            const inviteTitle = privateChatUserName
                                ? formatPrivateUserChatParticipantLabel({
                                    userName: privateChatUserName,
                                    displayName: privateChatProfile?.displayName,
                                })
                                : invite.boardName;
                            const accepting =
                                inviteBusyState?.boardId === invite.boardId &&
                                inviteBusyState.action === 'accept';
                            const declining =
                                inviteBusyState?.boardId === invite.boardId &&
                                inviteBusyState.action === 'decline';

                            return (
                                <ThemedView key={invite.boardId} style={styles.inviteRow}>
                                    <ThemedView style={styles.inviteCopy}>
                                        <ThemedText style={styles.inviteTitle}>{inviteTitle}</ThemedText>
                                        {invite.uniqueBoardId && !privateChatUserName ? (
                                            <ThemedText style={styles.detailText}>ID: {invite.uniqueBoardId}</ThemedText>
                                        ) : null}
                                    </ThemedView>

                                    <ThemedView style={styles.inviteActions}>
                                        <Button
                                            showText={true}
                                            buttonText={accepting ? 'Accepting...' : 'Accept'}
                                            onPress={() => handleInviteAction(invite, 'accept', inviteTitle)}
                                            disabled={inviteBusyState !== null}
                                            style={styles.primaryButton}
                                            textStyle={styles.buttonText}
                                        />
                                        <Button
                                            showText={true}
                                            buttonText={declining ? 'Declining...' : 'Decline'}
                                            onPress={() => handleInviteAction(invite, 'decline', inviteTitle)}
                                            disabled={inviteBusyState !== null}
                                            style={styles.secondaryButton}
                                            textStyle={styles.buttonText}
                                        />
                                    </ThemedView>
                                </ThemedView>
                            );
                        })}
                    </ThemedView>
                )}
            </ThemedView>
        </ScrollView>
    );
}

function getPrivateChatUserNamesFromInvites(
    invites: MessageBoardInvite[],
    currentUserName?: string | null
): string[] {
    const userNames = new Map<string, string>();

    for (const invite of invites) {
        const otherUserName = getOtherPrivateUserChatUserName(invite.boardName, currentUserName);

        if (otherUserName) {
            userNames.set(getProfileCacheKey(otherUserName), otherUserName);
        }
    }

    return Array.from(userNames.values());
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: Spacing.four,
        gap: Spacing.four,
    },
    header: {
        gap: Spacing.three,
    },
    backButton: {
        alignSelf: 'flex-start',
        backgroundColor: '#303342',
        borderRadius: 8,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
    },
    section: {
        borderWidth: 1,
        borderRadius: 8,
        padding: Spacing.three,
        gap: Spacing.three,
        backgroundColor: '#11131A',
    },
    sectionHeader: {
        backgroundColor: '#11131A',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        alignItems: 'center'
    },
    profileHeader: {
        backgroundColor: '#11131A',
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
    },
    avatarFrame: {
        width: 96,
        height: 96,
        borderRadius: 48,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#4DACFF80',
        backgroundColor: '#1c1c1e',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarInitial: {
        color: '#ffffff',
        fontSize: 36,
        fontWeight: '800',
    },
    profileCopy: {
        backgroundColor: '#11131A',
        flex: 1,
        minWidth: 0,
        gap: Spacing.two,
        alignItems: 'flex-start',
    },
    detailText: {
        fontSize: 15,
        opacity: 0.75,
    },
    inputGroup: {
        backgroundColor: '#11131A',
        gap: Spacing.two,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
    },
    input: {
        backgroundColor: '#1c1c1e',
        borderColor: '#444',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        color: '#ffffff',
        minHeight: 48,
    },
    multilineInput: {
        minHeight: 88,
        textAlignVertical: 'top',
    },
    actionRow: {
        backgroundColor: '#11131A',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.two,
    },
    primaryButton: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        minHeight: 40,
    },
    secondaryButton: {
        backgroundColor: '#303342',
        borderRadius: 8,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        minHeight: 40,
    },
    compactButton: {
        backgroundColor: '#303342',
        borderRadius: 8,
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.one,
        minHeight: 32,
    },
    compactButtonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '700',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
    },
    inviteList: {
        gap: Spacing.three,
    },
    inviteRow: {
        borderWidth: 1,
        borderColor: '#404040',
        borderRadius: 8,
        padding: Spacing.three,
        gap: Spacing.three,
        backgroundColor: '#161923',
    },
    inviteCopy: {
        gap: Spacing.one,
    },
    inviteTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    inviteActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.two,
    },
    emptyText: {
        fontSize: 14,
        opacity: 0.6,
    },
    errorContainer: {
        borderWidth: 1,
        borderColor: '#ff4444',
        borderRadius: 8,
        padding: Spacing.three,
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
    },
    errorText: {
        color: '#ff4444',
    },
    successText: {
        color: '#43D17A',
    },
    warningText: {
        color: '#FFD166',
    },
    diagnosticList: {
        backgroundColor: '#11131A',
        gap: Spacing.one,
    },
    diagnosticLine: {
        color: '#C8D0E0',
        opacity: 0.9,
    },
});
