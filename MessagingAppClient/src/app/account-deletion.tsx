import { Linking, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';
import { Button } from '@/components/ui/generic-button';
import {
    APP_NAME,
    DEVELOPER_NAME,
    PUBLIC_BASE_URL,
    SUPPORT_EMAIL,
} from '@/constants/legal';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const deletedData = [
    'Account login and profile data.',
    'Active user record, board memberships, favorites, invites, and join requests.',
    'Push notification subscriptions associated with the account.',
    'Uploaded images owned by the account.',
    'Messages sent by the account.',
];

export default function AccountDeletionScreen() {
    const theme = useTheme();

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.contentContainer}
        >
            <ThemedView style={styles.document}>
                <ThemedText type="title" style={styles.title}>Account Deletion</ThemedText>
                <ThemedText style={styles.lead}>
                    You can request deletion of your {APP_NAME} account and associated data from outside the app.
                </ThemedText>

                <ThemedView style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>Request By Email</ThemedText>
                    <ThemedText style={styles.bodyText}>
                        Email {SUPPORT_EMAIL} with your {APP_NAME} username and say that you want your
                        account deleted. {DEVELOPER_NAME} may ask follow-up questions to confirm account
                        ownership before completing the request.
                    </ThemedText>
                    <Button
                        showText={true}
                        buttonText={`Email ${SUPPORT_EMAIL}`}
                        onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} account deletion request`)}`)}
                        style={styles.primaryButton}
                        textStyle={styles.buttonText}
                    />
                </ThemedView>

                <ThemedView style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>In The App</ThemedText>
                    <ThemedText style={styles.bodyText}>
                        If you can still sign in, open Account, then use Delete Account. This starts deletion
                        directly from your signed-in session.
                    </ThemedText>
                </ThemedView>

                <ThemedView style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>What Gets Deleted</ThemedText>
                    <ThemedView style={styles.bulletList}>
                        {deletedData.map((item) => (
                            <ThemedText key={item} style={styles.bodyText}>
                                {'\u2022'} {item}
                            </ThemedText>
                        ))}
                    </ThemedView>
                    <ThemedText style={styles.bodyText}>
                        Some limited records may remain temporarily in backups, logs, or security records when
                        needed for legal, security, or operational reasons.
                    </ThemedText>
                </ThemedView>

                <ThemedView style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>Privacy Policy</ThemedText>
                    <ThemedText style={styles.bodyText}>
                        The privacy policy is available at {PUBLIC_BASE_URL}/privacy.
                    </ThemedText>
                    <Button
                        showText={true}
                        buttonText="Privacy Policy"
                        onPress={() => Linking.openURL(`${PUBLIC_BASE_URL}/privacy`)}
                        style={styles.secondaryButton}
                        textStyle={styles.buttonText}
                    />
                </ThemedView>
            </ThemedView>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        alignItems: 'center',
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.five,
    },
    document: {
        width: '100%',
        maxWidth: MaxContentWidth,
        gap: Spacing.four,
    },
    title: {
        fontSize: 40,
        lineHeight: 46,
    },
    lead: {
        fontSize: 18,
        lineHeight: 28,
    },
    section: {
        gap: Spacing.two,
    },
    sectionTitle: {
        fontSize: 22,
        lineHeight: 30,
    },
    bodyText: {
        lineHeight: 25,
    },
    bulletList: {
        gap: Spacing.two,
    },
    primaryButton: {
        alignSelf: 'flex-start',
        backgroundColor: '#007AFF',
        borderRadius: 8,
        minHeight: 42,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
    },
    secondaryButton: {
        alignSelf: 'flex-start',
        backgroundColor: '#303342',
        borderRadius: 8,
        minHeight: 42,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
    },
});
