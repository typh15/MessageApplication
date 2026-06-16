import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as APIHandler from '@/APIHandlers/ApiHandlerHub';
import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';
import { Button } from '@/components/ui/generic-button';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useBoardDetails } from '@/hooks/API/use-board-details';
import { useBoardJoinRequests } from '@/hooks/API/use-board-join-requests';
import { useTheme } from '@/hooks/use-theme';

interface ApprovalUser {
    userName: string;
    address?: string;
}

export default function ApprovalRequestsScreen() {
    const params = useLocalSearchParams();
    const rawBoardId = params.boardId as string | undefined;
    const boardId = rawBoardId ? parseInt(rawBoardId) : NaN;
    const isValidBoardId = !!rawBoardId && Number.isFinite(boardId);
    const router = useRouter();

    const [processingUserName, setProcessingUserName] = useState<string | null>(null);
    const [dismissedUserNames, setDismissedUserNames] = useState<string[]>([]);

    const theme = useTheme();

    const { data: boardInfo, loading: boardLoading } = useBoardDetails(boardId, isValidBoardId);
    const { data: joinRequests, loading: requestsLoading, refresh: refreshJoinRequests, } = useBoardJoinRequests(boardId, isValidBoardId);

    const boardTitle = boardInfo?.boardName ?? `Board ${boardId}`;
    const users = (joinRequests ?? []).filter(
        (user) => !dismissedUserNames.includes(user.userName)
    );
    const loading = boardLoading || requestsLoading;

    useEffect(() => {
        if (!isValidBoardId) {
            router.replace('../Chat-Page');
        }
    }, [isValidBoardId, router]);

    const handleApproveUser = async (user: ApprovalUser) => {
        try {
            setProcessingUserName(user.userName);

            await APIHandler.approveOfRequestedMembership(
                boardId,
                user.userName
            );

            setDismissedUserNames((current) => [...current, user.userName]);
            await refreshJoinRequests();

            Alert.alert('Success', `${user.userName} has been approved to join the board`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to approve user';
            console.error('Approval error:', err);
            Alert.alert('Error', errorMessage);
        } finally {
            setProcessingUserName(null);
        }
    };

    const handleDenyUser = async (user: ApprovalUser) => {
        setDismissedUserNames((current) => [...current, user.userName]);
        Alert.alert('Denied', `${user.userName}'s request has been denied`);
    };

    const handleBackToChat = () => {
        router.back();
    };

    if (loading) {
        return (
            <ThemedView style={styles.container}>
                <SafeAreaView style={styles.safeArea}>
                    <ActivityIndicator size="large" color={theme.text} />
                </SafeAreaView>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ThemedView style={styles.header}>
                    <Button
                        showText={true}
                        buttonText={'\u2190 Back'}
                        onPress={handleBackToChat}
                        style={styles.backButton}
                        borderWidth={2}
                        backgroundColor="transparent"
                        borderColor={theme.genericborder}
                        borderRadius={8}
                    />
                    <ThemedView style={{ flex: 1, alignItems: 'center' }}>
                        <ThemedText type="title" style={styles.boardTitle}>
                            Join Requests
                        </ThemedText>
                        <ThemedText style={styles.subtitle}>{boardTitle}</ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.placeholder} />
                </ThemedView>

                <ScrollView
                    style={styles.requestsScroll}
                    contentContainerStyle={styles.requestsList}
                >
                    {users.length === 0 ? (
                        <ThemedView style={styles.emptyContainer}>
                            <ThemedText style={styles.emptyText}>No pending requests</ThemedText>
                        </ThemedView>
                    ) : (
                        users.map((user, index) => (
                            <ThemedView
                                key={`${user.userName}-${index}`}
                                style={[styles.requestCard, { borderColor: theme.text + '90' }]}
                            >
                                <ThemedView style={styles.userInfo}>
                                    <ThemedText type="subtitle" style={styles.userName}>
                                        {user.userName}
                                    </ThemedText>
                                </ThemedView>

                                <ThemedView style={styles.buttonGroup}>
                                    <Button
                                        showText={true}
                                        buttonText="Approve"
                                        onPress={() => handleApproveUser(user)}
                                        disabled={processingUserName === user.userName}
                                        style={{ ...styles.actionButton, ...styles.approveButton }}
                                        backgroundColor="#34C759"
                                        borderRadius={8}
                                    />
                                    <Button
                                        showText={true}
                                        buttonText="Deny"
                                        onPress={() => handleDenyUser(user)}
                                        disabled={processingUserName === user.userName}
                                        style={{ ...styles.actionButton, ...styles.denyButton }}
                                        backgroundColor="#FF3B30"
                                        borderRadius={8}
                                    />
                                </ThemedView>
                            </ThemedView>
                        ))
                    )}
                </ScrollView>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.three,
        gap: Spacing.two,
        marginBottom: Spacing.two,
    },
    backButton: {
        minWidth: 80,
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.two,
    },
    boardTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: 14,
        opacity: 0.7,
        marginTop: Spacing.one,
    },
    placeholder: {
        minWidth: 80,
    },
    requestsScroll: {
        flex: 1,
        paddingHorizontal: Spacing.three,
    },
    requestsList: {
        gap: Spacing.two,
        paddingBottom: BottomTabInset + Spacing.three,
    },
    requestCard: {
        borderWidth: 2,
        borderRadius: 12,
        padding: Spacing.three,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.three,
    },
    userInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: Spacing.two,
    },
    actionButton: {
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        borderRadius: 8,
        minWidth: 70,
    },
    approveButton: {
        backgroundColor: '#34C759',
    },
    denyButton: {
        backgroundColor: '#FF3B30',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: Spacing.six,
    },
    emptyText: {
        fontSize: 16,
        opacity: 0.7,
        textAlign: 'center',
    },
});
