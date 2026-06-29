import { Image } from 'expo-image';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { getImageUrl, type PublicProfileResponse } from '@/APIHandlers/ApiHandlerHub';
import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';
import { Button } from '@/components/ui/generic-button';
import { Radius, Spacing, type AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type UserProfileCardProps = {
    profile: PublicProfileResponse;
    actionText?: string;
    actionLoadingText?: string;
    actionInProgress?: boolean;
    disabled?: boolean;
    showUniqueId?: boolean;
    style?: StyleProp<ViewStyle>;
    onAction?: (profile: PublicProfileResponse) => void;
};

export function UserProfileCard({
    profile,
    actionText,
    actionLoadingText,
    actionInProgress = false,
    disabled = false,
    showUniqueId = true,
    style,
    onAction,
}: UserProfileCardProps) {
    const theme = useTheme();
    const styles = createStyles(theme);
    const avatarImageUrl = profile.avatarImageId ? getImageUrl(profile.avatarImageId) : null;
    const userName = profile.userName?.trim() || 'Unknown user';
    const uniqueId = profile.uniqueId?.trim() || 'Unknown';
    const displayName = profile.displayName?.trim() || userName;
    const avatarInitial = displayName.charAt(0).toUpperCase() || '?';
    const buttonText = actionInProgress && actionLoadingText ? actionLoadingText : actionText;

    return (
        <ThemedView style={[styles.card, style]}>
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

            <ThemedView style={styles.copy}>
                <ThemedText style={styles.displayName} numberOfLines={1}>
                    {displayName}
                </ThemedText>
                <ThemedText style={styles.userName} numberOfLines={1}>
                    Username: {userName}
                </ThemedText>

                {showUniqueId ? (
                    <ThemedText style={styles.userName} numberOfLines={1}>
                        ID: {uniqueId}
                    </ThemedText>
                ) : null}

                {profile.publicBlurb ? (
                    <ThemedText style={styles.blurb}>
                        {profile.publicBlurb}
                    </ThemedText>
                ) : (
                    <ThemedText style={styles.blurbEmpty}>
                        No public blurb yet.
                    </ThemedText>
                )}

                {buttonText && onAction ? (
                    <Button
                        showText={true}
                        buttonText={buttonText}
                        onPress={() => onAction(profile)}
                        disabled={disabled || actionInProgress}
                        style={styles.actionButton}
                        textStyle={styles.actionButtonText}
                        backgroundColor={theme.actionPrimary}
                        borderRadius={Radius.sm}
                    />
                ) : null}
            </ThemedView>
        </ThemedView>
    );
}

function createStyles(theme: AppTheme) {
    return StyleSheet.create({
        card: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: Spacing.three,
            borderWidth: 1,
            borderColor: theme.borderSubtle,
            borderRadius: Radius.sm,
            padding: Spacing.three,
            backgroundColor: theme.surfacePreview,
        },

        avatarFrame: {
            width: 68,
            height: 68,
            borderRadius: 34,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.borderAccent,
            backgroundColor: theme.surfaceInput,
        },

        avatarImage: {
            width: '100%',
            height: '100%',
        },

        avatarInitial: {
            color: theme.text,
            fontSize: 26,
            fontWeight: '800',
        },

        copy: {
            flex: 1,
            minWidth: 0,
            gap: Spacing.half,
            backgroundColor: theme.surfacePreview,
        },

        displayName: {
            fontSize: 17,
            lineHeight: 22,
            fontWeight: '800',
            color: theme.text,
        },

        userName: {
            fontSize: 13,
            lineHeight: 18,
            color: theme.textSecondary,
        },

        blurb: {
            fontSize: 14,
            lineHeight: 20,
            color: theme.text,
            marginTop: Spacing.one,
        },

        blurbEmpty: {
            fontSize: 14,
            lineHeight: 20,
            color: theme.textSecondary,
            marginTop: Spacing.one,
            fontStyle: 'italic',
        },

        actionButton: {
            alignSelf: 'flex-start',
            minHeight: 40,
            paddingHorizontal: Spacing.three,
            paddingVertical: Spacing.two,
            marginTop: Spacing.two,
        },

        actionButtonText: {
            color: theme.textOnAccent,
            fontSize: 14,
            lineHeight: 18,
            fontWeight: '700',
        },
    });
}
