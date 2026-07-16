import type { ReactNode } from 'react';
import { Linking, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';
import { Button } from '@/components/ui/generic-button';
import {
    APP_NAME,
    DEVELOPER_NAME,
    PRIVACY_EFFECTIVE_DATE,
    PUBLIC_BASE_URL,
    SUPPORT_EMAIL,
} from '@/constants/legal';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const collectedData = [
    'Account data such as username, password authentication data, display name, profile text, and avatar image.',
    'User content such as boards, board memberships, board invites, messages, and images you choose to send or upload.',
    'Push notification data such as Expo push tokens, device identifiers supplied for notification registration, platform, and subscription update time.',
    'Technical data such as IP address and basic request diagnostics used to operate, secure, and troubleshoot the service.',
];

const useData = [
    'Create and authenticate accounts.',
    'Provide message boards, private chats, profile display, image uploads, and push notifications.',
    'Maintain app security, prevent abuse, debug failures, and operate the beta service.',
    'Respond to support, privacy, and deletion requests.',
];

const sharingData = [
    `${DEVELOPER_NAME} does not sell personal or sensitive user data.`,
    'Data may be processed by infrastructure and service providers needed to run the app, including hosting/database services and Expo push notification delivery.',
    'Data may be disclosed if required by law, to protect users, or to investigate abuse or security issues.',
];

export default function PrivacyPolicyScreen() {
    const theme = useTheme();

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.contentContainer}
        >
            <ThemedView style={styles.document}>
                <ThemedText type="title" style={styles.title}>Privacy Policy</ThemedText>
                <ThemedText style={styles.lead}>
                    This policy explains how {DEVELOPER_NAME} handles data for {APP_NAME}.
                </ThemedText>
                <ThemedText style={styles.meta}>Effective date: {PRIVACY_EFFECTIVE_DATE}</ThemedText>

                <PolicySection title="Contact">
                    <ThemedText style={styles.bodyText}>
                        Privacy questions and account deletion requests can be sent to {SUPPORT_EMAIL}.
                    </ThemedText>
                    <Button
                        showText={true}
                        buttonText={`Email ${SUPPORT_EMAIL}`}
                        onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
                        style={styles.primaryButton}
                        textStyle={styles.buttonText}
                    />
                </PolicySection>

                <PolicySection title="Data We Collect">
                    <BulletList items={collectedData} />
                </PolicySection>

                <PolicySection title="How We Use Data">
                    <BulletList items={useData} />
                </PolicySection>

                <PolicySection title="Sharing">
                    <BulletList items={sharingData} />
                </PolicySection>

                <PolicySection title="Security">
                    <ThemedText style={styles.bodyText}>
                        Passwords are stored as password hashes. Public production traffic is served over
                        HTTPS, and access to app data is limited to what is needed to operate and maintain
                        the service.
                    </ThemedText>
                </PolicySection>

                <PolicySection title="Retention And Deletion">
                    <ThemedText style={styles.bodyText}>
                        Account data is kept while your account is active. When an account is deleted, the app
                        deletes the account record, authentication/profile data, active user record, board
                        memberships, favorites, invites, join requests, push subscriptions, uploaded images,
                        and messages sent by that account. Some limited records may remain temporarily in
                        backups, logs, or security records when needed for legal, security, or operational
                        reasons.
                    </ThemedText>
                    <Button
                        showText={true}
                        buttonText="Account Deletion"
                        onPress={() => Linking.openURL(`${PUBLIC_BASE_URL}/account-deletion`)}
                        style={styles.secondaryButton}
                        textStyle={styles.buttonText}
                    />
                </PolicySection>

                <PolicySection title="Children">
                    <ThemedText style={styles.bodyText}>
                        {APP_NAME} is not directed to children. Do not use the app if you are not old enough
                        to consent to this policy in your location.
                    </ThemedText>
                </PolicySection>

                <PolicySection title="Changes">
                    <ThemedText style={styles.bodyText}>
                        This policy may be updated as the beta changes. The effective date above will be
                        updated when material changes are made.
                    </ThemedText>
                </PolicySection>
            </ThemedView>
        </ScrollView>
    );
}

function PolicySection({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>{title}</ThemedText>
            {children}
        </ThemedView>
    );
}

function BulletList({ items }: { items: string[] }) {
    return (
        <ThemedView style={styles.bulletList}>
            {items.map((item) => (
                <ThemedText key={item} style={styles.bodyText}>
                    {'\u2022'} {item}
                </ThemedText>
            ))}
        </ThemedView>
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
    meta: {
        opacity: 0.72,
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
